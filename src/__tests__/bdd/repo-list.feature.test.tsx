import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, createMockRepo, createMockConfig } from '../helpers/test-utils';
import RepoList from '../../components/RepoList';

describe('Feature: 仓库列表', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario: 加载中显示骨架屏', () => {
    // Given: 正在加载，没有仓库数据
    // When: 渲染 RepoList
    renderWithProviders(<RepoList repos={[]} loading={true} />);

    // Then: 应该显示骨架屏（LoadingSkeleton renders multiple skeleton cards）
    // Skeleton cards have an animate-pulse class
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('Scenario: 显示仓库卡片列表', () => {
    // Given: 有仓库数据
    const repos = [
      createMockRepo({ id: 1, name: 'repo-one' }),
      createMockRepo({ id: 2, name: 'repo-two' }),
      createMockRepo({ id: 3, name: 'repo-three' }),
    ];

    // When: 渲染 RepoList
    renderWithProviders(<RepoList repos={repos} loading={false} />);

    // Then: 应该显示所有仓库名称
    expect(screen.getByText('repo-one')).toBeInTheDocument();
    expect(screen.getByText('repo-two')).toBeInTheDocument();
    expect(screen.getByText('repo-three')).toBeInTheDocument();
  });

  it('Scenario: 仓库卡片显示名称、描述、星标数、语言', () => {
    // Given: 一个有完整信息的仓库
    const repo = createMockRepo({
      id: 100,
      name: 'awesome-project',
      description: 'An awesome project for testing',
      stargazers_count: 1234,
      language: 'Rust',
    });

    // When: 渲染 RepoList
    renderWithProviders(<RepoList repos={[repo]} loading={false} />);

    // Then: 应该显示仓库名称
    expect(screen.getByText('awesome-project')).toBeInTheDocument();
    // And: 应该显示描述（可能被翻译，但原文或翻译应出现）
    expect(screen.getByText('An awesome project for testing')).toBeInTheDocument();
    // And: 应该显示星标数
    expect(screen.getByText('1,234')).toBeInTheDocument();
    // And: 应该显示语言
    expect(screen.getByText('Rust')).toBeInTheDocument();
  });

  it('Scenario: 没有仓库时显示空状态', () => {
    // Given: 没有仓库，且不在加载中
    // When: 渲染 RepoList
    renderWithProviders(<RepoList repos={[]} loading={false} />);

    // Then: 应该显示空状态提示
    expect(screen.getByText('No Projects Found…')).toBeInTheDocument();
  });

  it('Scenario: 有更多数据时显示加载更多骨架屏', () => {
    // Given: 有仓库数据且 hasMore 为 true
    const repos = [createMockRepo({ id: 1, name: 'repo-one' })];

    // When: 渲染 RepoList
    renderWithProviders(<RepoList repos={repos} loading={false} hasMore={true} />);

    // Then: 应该显示仓库
    expect(screen.getByText('repo-one')).toBeInTheDocument();
    // And: 应该显示额外的骨架屏（hasMore = true triggers LoadingSkeleton count=3）
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
