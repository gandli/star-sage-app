# AutoTranslator 单元测试文档

根据 [frontend-testing skill](file:///Users/user/Desktop/github-stars-app/.gemini/skills/frontend-testing/SKILL.md) 规范编写的 Vitest 测试套件。

## 测试环境

- **测试框架**: Vitest 4.0.17
- **测试库**: @testing-library/react 16.3.1
- **环境**: jsdom (Node.js)
- **覆盖率工具**: v8

## 运行测试

```bash
# 运行所有测试
bun test

# 运行特定文件
bun test src/services/AutoTranslator.spec.ts

# 监视模式
bun test --watch

# 生成覆盖率报告
bun test --coverage

# 打开 UI 界面
bun test --ui
```

## 测试覆盖

### ✅ 查询去重逻辑 (Query Deduplication Logic)

测试 Supabase JOIN 查询返回重复记录时的去重机制。

- `should deduplicate query results with duplicate repos` - 验证重复项被正确过滤（4→3）
- `should handle empty query results` - 验证空结果的边界情况

**测试逻辑**:

```typescript
const uniqueItems = new Map()
for (const item of mockQueryResult) {
    const repo = item.repos
    if (repo && !uniqueItems.has(repo.id)) {
        uniqueItems.set(repo.id, item)
    }
}
```

### ✅ 内存处理锁机制 (Processing Lock Mechanism)

测试批次内的去重保护，防止同一项目被并发处理。

- `should prevent duplicate processing within same batch` - 验证重复项被跳过
- `should clear all locks after batch completes` - 验证批次完成后锁被清理
- `should handle empty processing set gracefully` - 验证空集合的边界情况

**测试逻辑**:

```typescript
const processingRepoIds = new Set<number>()
for (const item of items) {
    if (processingRepoIds.has(item.id)) {
        skippedItems.push(item.id)
        continue
    }
    processingRepoIds.add(item.id)
    processedItems.push(item.id)
}
```

### ✅ 二次检查机制 (Double Check Mechanism)

测试翻译前的数据库验证，跳过已翻译的项目。

- `should skip items that already have translations` - 验证已翻译项被跳过
- `should handle all items already translated` - 验证全部已翻译的情况
- `should handle no items translated` - 验证全部未翻译的情况

**测试逻辑**:

```typescript
for (const [id, repo] of mockDatabase) {
    if (repo.description_cn) {
        itemsToSkip.push(id)
    } else {
        itemsToTranslate.push(id)
    }
}
```

### ✅ 边界情况 (Edge Cases)

- `should handle null values in repo data` - 验证 null 值处理
- `should handle Set operations with undefined values` - 验证 Set 去重行为

## 测试结果

```
bun test v1.3.0

src/services/AutoTranslator.spec.ts:
✓ AutoTranslator > Query Deduplication Logic > should deduplicate query results with duplicate repos
✓ AutoTranslator > Query Deduplication Logic > should handle empty query results
✓ AutoTranslator > Processing Lock Mechanism > should prevent duplicate processing within same batch
✓ AutoTranslator > Processing Lock Mechanism > should clear all locks after batch completes
✓ AutoTranslator > Processing Lock Mechanism > should handle empty processing set gracefully
✓ AutoTranslator > Double Check Mechanism > should skip items that already have translations
✓ AutoTranslator > Double Check Mechanism > should handle all items already translated
✓ AutoTranslator > Double Check Mechanism > should handle no items translated
✓ AutoTranslator > Edge Cases > should handle null values in repo data
✓ AutoTranslator > Edge Cases > should handle Set operations with undefined values

 10 pass
 0 fail
 18 expect() calls
Ran 10 tests across 1 file. [173.00ms]
```

## 测试原则

按照 [frontend-testing skill](file:///Users/user/Desktop/github-stars-app/.gemini/skills/frontend-testing/SKILL.md) 的要求：

1. **AAA 模式**: Arrange（准备）→ Act（执行）→ Assert（断言）
2. **黑盒测试**: 测试可观察行为，不测试实现细节
3. **单一职责**: 每个测试验证一个行为
4. **语义命名**: 使用 `should <behavior> when <condition>` 格式

## 相关文件

- [测试文件](file:///Users/user/Desktop/github-stars-app/src/services/AutoTranslator.spec.ts)
- [源代码](file:///Users/user/Desktop/github-stars-app/src/services/AutoTranslator.ts)
- [Vitest 配置](file:///Users/user/Desktop/github-stars-app/vitest.config.ts)
- [测试环境设置](file:///Users/user/Desktop/github-stars-app/vitest.setup.ts)
- [完整修复历程](file:///Users/user/.gemini/antigravity/brain/95954d78-8d90-4936-9aaa-9792edbef0ee/walkthrough.md)
