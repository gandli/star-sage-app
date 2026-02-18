import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../helpers/test-utils';

// We test the App component which conditionally renders AuthScreen vs MainLayout
import App from '../../App';

describe('Feature: 用户认证', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('Scenario: 未登录用户看到登录页', () => {
    // Given: 用户未登录（session 为 null）
    // When: 渲染应用
    renderWithProviders(<App />, {
      providerOverrides: {
        auth: { session: null, user: null, loading: false },
      },
    });

    // Then: 应该看到登录页面的标题 "StarSage"
    expect(screen.getByText('StarSage')).toBeInTheDocument();
    // And: 应该看到 GitHub 登录按钮
    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
    // And: 应该看到邮箱登录表单
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  it('Scenario: 加载中显示加载指示器', () => {
    // Given: 认证状态正在加载
    // When: 渲染应用
    renderWithProviders(<App />, {
      providerOverrides: {
        auth: { session: null, user: null, loading: true },
      },
    });

    // Then: 应该看到加载动画（svg animate-spin class on Loader2）
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('Scenario: 已登录用户看到主界面', () => {
    // Given: 用户已登录
    // When: 渲染应用
    renderWithProviders(<App />, {
      providerOverrides: {
        auth: { loading: false }, // defaults have session
      },
    });

    // Then: 不应该看到登录页面
    expect(screen.queryByText('Continue with GitHub')).not.toBeInTheDocument();
  });
});
