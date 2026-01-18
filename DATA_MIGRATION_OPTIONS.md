# 数据迁移方案

## 问题分析

- `user_stars` 表：0 条记录（新架构）
- `repos` 表：4598 条记录（旧数据）
- 界面显示不一致：Starred Repos 显示 2400

## 解决方案

### 选项 1：迁移现有数据（推荐）

将 `repos` 表中的所有数据关联到当前用户，填充到 `user_stars` 表。

**优点**：

- 保留现有数据
- 无需重新同步

**SQL 脚本**：

```sql
-- 将所有 repos 关联到当前用户
INSERT INTO user_stars (user_id, repo_id, starred_at)
SELECT 
    auth.uid(),
    id,
    starred_at
FROM repos
ON CONFLICT (user_id, repo_id) DO NOTHING;
```

### 选项 2：重新同步

清空数据，点击同步按钮重新从 GitHub 获取。

**优点**：

- 数据最新
- 自动使用新架构

**缺点**：

- 需要重新同步（可能需要几分钟）
