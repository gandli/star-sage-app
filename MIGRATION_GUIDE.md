# Multi-User Migration Guide

## 概述

本次更新将应用从单用户架构升级为多用户架构，实现了：

- ✅ 仓库信息共享（所有用户共享翻译和 README 摘要）
- ✅ 用户独立的星标列表
- ✅ 用户独立的设置配置

## 数据库迁移步骤

### 1. 应用数据库迁移

使用 Supabase MCP 工具或 Supabase Dashboard 执行迁移文件：

```bash
# 文件位置
supabase/migrations/20260118_multi_user_schema.sql
```

**迁移内容**：

- 创建 `user_stars` 表（用户星标关系）
- 创建 `user_settings` 表（用户配置）
- 为 `repos` 表启用 RLS（共享访问）
- 设置所有表的 RLS 策略

### 2. 数据迁移（可选）

> [!WARNING]
> 现有 `repos` 表中的数据没有 `user_id` 关联，无法自动迁移到 `user_stars`

**选项 A**：清空并重新同步（推荐）

```sql
-- 清空现有数据
TRUNCATE TABLE repos CASCADE;

-- 用户重新登录并同步 GitHub 星标
```

**选项 B**：关联到特定用户（如果只有一个用户）

```sql
-- 假设用户 ID 为 'xxx-xxx-xxx'
INSERT INTO user_stars (user_id, repo_id, starred_at)
SELECT 'xxx-xxx-xxx', id, NOW()
FROM repos;
```

## 应用层变更

### 新增文件

1. **`src/hooks/useUserSettings.ts`**: 管理用户设置
2. **`src/hooks/useUserRepos.ts`**: 获取用户星标仓库
3. **`supabase/migrations/20260118_multi_user_schema.sql`**: 数据库迁移

### 修改文件

1. **`src/hooks/useRepoStats.ts`**: 查询用户特定的统计数据
2. **`src/hooks/useGithubSync.ts`**: 同时写入 `repos` 和 `user_stars`
3. **`src/App.tsx`**: 集成 `useUserRepos` 和数据合并逻辑

## 功能验证

### 测试场景

#### 1. 多用户隔离

- [ ] 用户 A 登录，同步星标
- [ ] 用户 B 登录，同步星标
- [ ] 验证两个用户看到的仓库列表不同

#### 2. 共享翻译

- [ ] 用户 A 翻译某个仓库
- [ ] 用户 B 也星标了同一个仓库
- [ ] 验证用户 B 能看到用户 A 的翻译

#### 3. 独立设置

- [ ] 用户 A 配置 GitHub Token
- [ ] 用户 B 配置不同的 GitHub Token
- [ ] 验证设置互不影响

## 回滚方案

如果需要回滚到单用户架构：

```sql
-- 删除新表
DROP TABLE IF EXISTS user_stars CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;

-- 禁用 repos 表的 RLS
ALTER TABLE repos DISABLE ROW LEVEL SECURITY;
```

然后恢复代码到之前的版本。

## 注意事项

1. **首次登录**：用户需要重新同步 GitHub 星标
2. **性能**：`user_stars` 表使用了索引优化查询性能
3. **RLS 策略**：确保 Supabase RLS 已启用，否则会有安全风险
