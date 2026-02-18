import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, createMockConfig } from '../helpers/test-utils';
import SettingsModal from '../../components/SettingsModal';

describe('Feature: 设置面板', () => {
  const defaultConfig = createMockConfig();
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockSetTempConfig: ReturnType<typeof vi.fn>;
  let mockOnSave: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnClose = vi.fn();
    mockSetTempConfig = vi.fn();
    mockOnSave = vi.fn();
  });

  it('Scenario: 打开设置面板', () => {
    // Given: show 为 true
    // When: 渲染 SettingsModal
    renderWithProviders(
      <SettingsModal
        show={true}
        onClose={mockOnClose}
        tempConfig={defaultConfig}
        setTempConfig={mockSetTempConfig}
        onSave={mockOnSave}
        config={defaultConfig}
      />,
    );

    // Then: 应该看到设置面板标题
    expect(screen.getByText('Initialization')).toBeInTheDocument();
    // And: 应该看到 Username 和 API Token 切换按钮
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('API Token')).toBeInTheDocument();
    // And: 应该看到保存按钮
    expect(screen.getByText('Confirm & Sync')).toBeInTheDocument();
  });

  it('Scenario: 修改 GitHub 用户名并保存', () => {
    // Given: 设置面板已打开
    renderWithProviders(
      <SettingsModal
        show={true}
        onClose={mockOnClose}
        tempConfig={{ ...defaultConfig, value: '' }}
        setTempConfig={mockSetTempConfig}
        onSave={mockOnSave}
        config={defaultConfig}
      />,
    );

    // When: 输入新的用户名
    const input = screen.getByPlaceholderText('e.g. vercel');
    fireEvent.change(input, { target: { value: 'newuser' } });

    // Then: setTempConfig 被调用
    expect(mockSetTempConfig).toHaveBeenCalled();

    // When: 点击保存按钮
    fireEvent.click(screen.getByText('Confirm & Sync'));

    // Then: onSave 被调用
    expect(mockOnSave).toHaveBeenCalled();
  });

  it('Scenario: 取消设置不影响当前配置', () => {
    // Given: 设置面板已打开，config 已有值
    renderWithProviders(
      <SettingsModal
        show={true}
        onClose={mockOnClose}
        tempConfig={defaultConfig}
        setTempConfig={mockSetTempConfig}
        onSave={mockOnSave}
        config={defaultConfig}
      />,
    );

    // When: 点击关闭按钮（X）
    const closeButton = screen.getByRole('button', { name: '' });
    // The close button has an X icon, find it
    const allButtons = screen.getAllByRole('button');
    const xButton = allButtons.find(btn => btn.querySelector('.lucide-x'));
    if (xButton) {
      fireEvent.click(xButton);
      // Then: onClose 被调用，onSave 没有被调用
      expect(mockOnClose).toHaveBeenCalled();
    }
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('Scenario: 设置面板关闭时不渲染', () => {
    // Given: show 为 false
    // When: 渲染 SettingsModal
    renderWithProviders(
      <SettingsModal
        show={false}
        onClose={mockOnClose}
        tempConfig={defaultConfig}
        setTempConfig={mockSetTempConfig}
        onSave={mockOnSave}
        config={defaultConfig}
      />,
    );

    // Then: 不应该看到设置面板
    expect(screen.queryByText('Initialization')).not.toBeInTheDocument();
  });
});
