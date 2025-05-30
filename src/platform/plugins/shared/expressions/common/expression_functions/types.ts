/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PersistableStateDefinition } from '@kbn/kibana-utils-plugin/common';
import { ArgumentType } from './arguments';
import { TypeToString, TypeString, UnmappedTypeStrings } from '../types/common';
import { ExecutionContext } from '../execution/types';
import {
  ExpressionFunctionClog,
  ExpressionFunctionFont,
  ExpressionFunctionVarSet,
  ExpressionFunctionVar,
  ExpressionFunctionTheme,
  ExpressionFunctionCumulativeSum,
  ExpressionFunctionDerivative,
  ExpressionFunctionMovingAverage,
  ExpressionFunctionOverallMetric,
  ExpressionFunctionMathColumn,
} from './specs';
import { ExpressionAstFunction } from '../ast';

/**
 * `ExpressionFunctionDefinition` is the interface plugins have to implement to
 * register a function in `expressions` plugin.
 */
export interface ExpressionFunctionDefinition<
  Name extends string,
  Input,
  Arguments extends Record<keyof unknown, unknown>,
  Output,
  Context extends ExecutionContext = ExecutionContext
> extends PersistableStateDefinition<ExpressionAstFunction['arguments']> {
  /**
   * The name of the function, as will be used in expression.
   */
  name: Name;

  /**
   * The flag to mark the function as deprecated.
   */
  deprecated?: boolean;

  /**
   * if set to true function will be disabled (but its migrate function will still be available)
   */
  disabled?: boolean;

  namespace?: string;

  /**
   * Name of type of value this function outputs.
   */
  type?: TypeString<Output> | UnmappedTypeStrings;

  /**
   * Opt-in to caching this function. By default function outputs are cached and given the same inputs cached result is returned.
   *
   * It is possible to collect side effects produced by the function
   * (e.g. logging, sending events to the server, etc.) and return a
   * handler to reproduce such side effects when the function cache is used
   * instead of the original function implementation.
   * @param args Parameters set for this function in expression.
   * @param context Object with functions to perform side effects. This object
   *     is created for the duration of the execution of expression and is the
   *     same for all functions in expression chain.
   * @returns A handler to be called to reproduce side effects when the function cache is used.
   *
   */
  allowCache?: boolean | { withSideEffects(args: Arguments, context: Context): () => void };

  /**
   * List of allowed type names for input value of this function. If this
   * property is set the input of function will be cast to the first possible
   * type in this list. If this property is missing the input will be provided
   * to the function as-is.
   */
  inputTypes?: Array<TypeToString<Input>>;

  /**
   * Specification of arguments that function supports. This list will also be
   * used for autocomplete functionality when your function is being edited.
   */
  args: { [key in keyof Arguments]: ArgumentType<Arguments[key]> };

  /**
   * @todo What is this?
   */
  aliases?: string[];

  /**
   * Help text displayed in the Expression editor. This text should be
   * internationalized.
   */
  help: string;

  /**
   * The actual implementation of the function.
   *
   * @param input Output of the previous function, or initial input.
   * @param args Parameters set for this function in expression.
   * @param context Object with functions to perform side effects. This object
   *     is created for the duration of the execution of expression and is the
   *     same for all functions in expression chain.
   */
  fn(input: Input, args: Arguments, context: Context): Output;

  /**
   * @deprecated Use `inputTypes` instead.
   */
  context?: {
    /**
     * @deprecated This is alias for `inputTypes`, use `inputTypes` instead.
     */
    types: AnyExpressionFunctionDefinition['inputTypes'];
  };
}

/**
 * Type to capture every possible expression function definition.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyExpressionFunctionDefinition = ExpressionFunctionDefinition<
  string,
  any,
  Record<string, any>,
  any
>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * A mapping of `ExpressionFunctionDefinition`s for functions which the
 * Expressions services provides out-of-the-box. Any new functions registered
 * by the Expressions plugin should have their types added here.
 *
 * @public
 */
export interface ExpressionFunctionDefinitions {
  clog: ExpressionFunctionClog;
  font: ExpressionFunctionFont;
  var_set: ExpressionFunctionVarSet;
  var: ExpressionFunctionVar;
  theme: ExpressionFunctionTheme;
  cumulative_sum: ExpressionFunctionCumulativeSum;
  overall_metric: ExpressionFunctionOverallMetric;
  derivative: ExpressionFunctionDerivative;
  moving_average: ExpressionFunctionMovingAverage;
  math_column: ExpressionFunctionMathColumn;
}
