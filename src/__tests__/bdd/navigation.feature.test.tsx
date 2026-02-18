import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../helpers/test-utils';
import MainLayout from '../../components/MainLayout';

describe('Feature: 视图导航', () => {
  let mockSetActiveView: ReturnType<typeof vi.fn>;
  let mockSetSelectedLanguage: ReturnType<typeof vi.fn>;
  let mockSetCurrentPage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Ensure sidebar is NOT collapsed so text labels are visible
    localStorage.setItem('gh_stars_sidebar_collapsed', 'false');
    mockSetActiveView = vi.fn();
    mockSetSelectedLanguage = vi.fn();
    mockSetCurrentPage = vi.fn();
  });

  it('Scenario: 默认显示 overview 视图', () => {
    // Given: activeView 为 overview
    // When: 渲染主布局
    renderWithProviders(<MainLayout />, {
      providerOverrides: {
        appState: { activeView: 'overview', setActiveView: mockSetActiveView },
      },
    });

    // Then: 侧边栏应该有 "Data Overview" 导航项
    expect(screen.getByText('Data Overview')).toBeInTheDocument();
  });

  it('Scenario: 切换到 list 视图', () => {
    // Given: 当前显示 overview
    renderWithProviders(<MainLayout />, {
      providerOverrides: {
        appState: {
          activeView: 'overview',
          setActiveView: mockSetActiveView,
          setIsMobileMenuOpen: vi.fn(),
        },
      },
    });

    // When: 点击 "Starred List" 导航项
    const listButton = screen.getByText('Starred List');
    fireEvent.click(listButton);

    // Then: setActiveView 被调用为 'list'
    expect(mockSetActiveView).toHaveBeenCalledWith('list');
  });

  it('Scenario: 选择编程语言过滤', () => {
    // Given: 有语言统计数据
    renderWithProviders(<MainLayout />, {
      providerOverrides: {
        appState: {
          activeView: 'list',
          setActiveView: mockSetActiveView,
          setSelectedLanguage: mockSetSelectedLanguage,
          setCurrentPage: mockSetCurrentPage,
          setIsMobileMenuOpen: vi.fn(),
        },
        starData: {
          repos: [],
          languageStats: [
            { name: 'TypeScript', value: 30 },
            { name: 'Python', value: 20 },
          ],
        },
      },
    });

    // When: 点击 "TypeScript" 语言
    const tsButton = screen.getByText('TypeScript');
    fireEvent.click(tsButton);

    // Then: setSelectedLanguage 被调用
    expect(mockSetSelectedLanguage).toHaveBeenCalledWith('TypeScript');
    // And: 翻页重置为第 1 页
    expect(mockSetCurrentPage).toHaveBeenCalledWith(1);
  });
});
