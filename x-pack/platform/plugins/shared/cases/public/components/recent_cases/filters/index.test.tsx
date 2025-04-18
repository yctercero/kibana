/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, fireEvent, screen } from '@testing-library/react';
import { RecentCasesFilters, caseFilterOptions } from '.';
import type { FilterMode } from '../types';
import { renderWithTestingProviders } from '../../../common/mock';

describe('Severity form field', () => {
  const setFilterBy = jest.fn();
  const filterBy: FilterMode = 'recentlyCreated';

  const props = {
    filterBy,
    setFilterBy,
    hasCurrentUserInfo: true,
    isLoading: false,
  };

  it('renders', () => {
    renderWithTestingProviders(<RecentCasesFilters {...props} />);
    expect(screen.getByTestId('recent-cases-filter')).toBeTruthy();
  });

  it('renders loading state correctly', () => {
    renderWithTestingProviders(<RecentCasesFilters {...props} isLoading={true} />);
    expect(screen.getByLabelText('Loading')).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('renders disabled  state correctly', () => {
    renderWithTestingProviders(<RecentCasesFilters {...props} hasCurrentUserInfo={false} />);
    expect(screen.getByTestId('recent-cases-filter')).toHaveAttribute('disabled');
  });

  it('selects the correct value when changed to reported by me', async () => {
    renderWithTestingProviders(<RecentCasesFilters {...props} />);

    const recentCasesFilter = screen.getByTestId('recent-cases-filter');

    expect(recentCasesFilter).toBeInTheDocument();

    expect(screen.getByText(caseFilterOptions[1].label)).toBeInTheDocument();

    fireEvent.change(recentCasesFilter, { target: { value: 'myRecentlyReported' } });

    await waitFor(() => {
      expect(setFilterBy).toHaveBeenCalledWith('myRecentlyReported');
    });
  });

  it('selects the correct value when changed assigned to me', async () => {
    renderWithTestingProviders(<RecentCasesFilters {...props} />);

    const recentCasesFilter = screen.getByTestId('recent-cases-filter');

    expect(recentCasesFilter).toBeInTheDocument();

    expect(screen.getByText(caseFilterOptions[2].label)).toBeInTheDocument();

    fireEvent.change(recentCasesFilter, { target: { value: 'myRecentlyAssigned' } });

    await waitFor(() => {
      expect(setFilterBy).toHaveBeenCalledWith('myRecentlyAssigned');
    });
  });
});
