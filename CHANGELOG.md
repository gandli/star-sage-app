# 更新日志 (Changelog)

## [0.0.1] - 2026-01-17

这是 StarSage 的首个稳定版本。

### ✨ 核心功能

- **品牌重定义**: 正式更名为 **StarSage**,全站 UI 视觉标识统一。
- **高性能引擎**:
  - 全量 CSS 变量驱动的主题系统,支持秒级主题切换。
  - 集成 React `useTransition` 优化渲染流畅度。
  - 使用 IndexedDB 承载大型仓库数据的高性能本地加载。
- **智能化增强**:
  - **自动翻译**: 集成 MyMemory 接口,自动汉化英文项目简介并持久化缓存。
  - **动态布局**: 适配 Topics 状态的自适应卡片行数调节（3行 vs 6行）。
- **美学 UI/UX**:
  - 全套 Devicon 品牌图标集成。
  - 响应式磨砂玻璃 (Glassmorphism) 设计系统。
  - 无缝的视图状态持久化（刷新不重置视图）。

### 🛠 技术架构

- 基座: Vite 7 + React 19 + TypeScript
- 样式: Tailwind CSS 4
- 动效: Framer Motion
- 数据: IndexedDB + LocalStorage
