/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { indicatorSchema, objectiveSchema } from '../../schema';
import { dateType, groupingsSchema } from '../../schema/common';

const getPreviewDataParamsSchema = t.type({
  body: t.intersection([
    t.type({
      indicator: indicatorSchema,
      range: t.type({
        from: dateType,
        to: dateType,
      }),
    }),
    t.partial({
      objective: objectiveSchema,
      remoteName: t.string,
      groupings: groupingsSchema,
      groupBy: t.array(t.string),
    }),
  ]),
});

const previewDataResponseSchema = t.intersection([
  t.type({
    date: dateType,
    sliValue: t.union([t.number, t.null]),
  }),
  t.partial({
    events: t.type({
      good: t.number,
      bad: t.number,
      total: t.number,
    }),
  }),
]);

const getPreviewDataResponseSchema = t.intersection([
  t.type({
    results: t.array(previewDataResponseSchema),
  }),
  t.partial({ groups: t.record(t.string, t.array(previewDataResponseSchema)) }),
]);

type GetPreviewDataParams = t.TypeOf<typeof getPreviewDataParamsSchema.props.body>;
type GetPreviewDataResponse = t.OutputOf<typeof getPreviewDataResponseSchema>;

export { getPreviewDataParamsSchema, getPreviewDataResponseSchema, previewDataResponseSchema };
export type { GetPreviewDataParams, GetPreviewDataResponse };
