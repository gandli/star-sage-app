import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../helpers/test-utils';
import Header from '../../components/Header';
import { createMockConfig, createMockProfile } from '../helpers/test-utils';

const defaultHeaderProps = {
  activeView: 'list' as const,
  selectedLanguage: null,
  theme: 'light' as const,
  setTheme: vi.fn(),
  config: createMockConfig(),
  loading: false,
  onRefresh: vi.fn(),
  searchQuery: '',
  setSearchQuery: vi.fn(),
  onSearch: vi.fn(),
  profile: createMockProfile(),
  currentPage: 1,
  totalPages: 5,
  setCurrentPage: vi.fn(),
  sortOrder: 'starred_at' as const,
  setSortOrder: vi.fn(),
  sortDirection: 'desc' as const,
  setSortDirection: vi.fn(),
  onOpenMenu: vi.fn(),
};

describe('Feature: 搜索与过滤', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario: 输入关键词搜索仓库', () => {
    // Given: 渲染 Header 组件
    const setSearchQuery = vi.fn();
    renderWithProviders(
      <Header {...defaultHeaderProps} setSearchQuery={setSearchQuery} />,
    );

    // When: 在搜索框输入关键词
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'react' } });

    // Then: setSearchQuery 被调用
    expect(setSearchQuery).toHaveBeenCalledWith('react');
  });

  it('Scenario: 切换排序方向', () => {
    // Given: 当前排序方向为 desc, activeView 为 list
    // The sort direction button has aria-label "Sort descending" or "Sort ascending"
    // Note: The button is hidden lg:flex but in jsdom all elements are in DOM
    const setSortDirection = vi.fn();
    renderWithProviders(
      <Header {...defaultHeaderProps} setSortDirection={setSortDirection} sortDirection="desc" />,
    );

    // When: 点击排序方向按钮
    const sortDirButton = screen.getByLabelText('Sort descending');
    fireEvent.click(sortDirButton);

    // Then: setSortDirection 被调用切换为 asc
    expect(setSortDirection).toHaveBeenCalledWith('asc');
  });

  it('Scenario: 按星标数排序', () => {
    // Given: 渲染 Header，当前排序为 starred_at
    const setSortOrder = vi.fn();
    renderWithProviders(
      <Header {...defaultHeaderProps} setSortOrder={setSortOrder} />,
    );

    // When: 在排序选择器中选择 Popularity (stargazers_count)
    const select = screen.getByDisplayValue('Starred At');
    fireEvent.change(select, { target: { value: 'stargazers_count' } });

    // Then: setSortOrder 被调用
    expect(setSortOrder).toHaveBeenCalledWith('stargazers_count');
  });

  it('Scenario: 按更新时间排序', () => {
    // Given: 渲染 Header
    const setSortOrder = vi.fn();
    renderWithProviders(
      <Header {...defaultHeaderProps} setSortOrder={setSortOrder} />,
    );

    // When: 选择 Updated 排序
    const select = screen.getByDisplayValue('Starred At');
    fireEvent.change(select, { target: { value: 'updated_at' } });

    // Then: setSortOrder 被调用
    expect(setSortOrder).toHaveBeenCalledWith('updated_at');
  });
});
