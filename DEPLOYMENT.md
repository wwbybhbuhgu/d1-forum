# Forum App Deployment Guide

## 环境配置

### 1. 设置 Resend API Key

在 Cloudflare Dashboard 中设置环境变量，或使用 wrangler 命令：

```bash
# 设置 Resend API Key（替换为你的实际 key）
wrangler secret put RESEND_API_KEY
# 输入：re_xxxxxxxxxxxxx

# 设置管理员邮箱（可选，默认为 admin@wujunbo.top）
wrangler secret put ADMIN_EMAIL
# 输入：your-admin-email@wujunbo.top
```

或者在 Cloudflare Workers 控制面板中：
1. 进入 Workers & Pages
2. 选择 `d1-forum` Worker
3. 点击 "Settings" > "Variables"
4. 添加环境变量：
   - `RESEND_API_KEY`: `re_xxxxxxxxxxxxx` (你的 Resend API key)
   - `ADMIN_EMAIL`: `admin@wujunbo.top` (管理员邮箱)

### 2. 部署

```bash
npx wrangler deploy
```

## 数据库迁移

数据库表会自动创建，迁移文件位于 `migrations/` 目录。

如果需要手动运行迁移：

```bash
npx wrangler d1 execute forum --file=migrations/001_init.sql
```

## 功能说明

- **邮箱验证码登录/注册**：使用 Resend 发送邮件验证码
- **管理员权限**：通过 `ADMIN_EMAIL` 环境变量配置的管理员邮箱自动获得管理员权限
- **帖子管理**：创建、编辑、删除帖子
- **评论系统**：支持评论和删除评论

## 注意事项

1. `RESEND_API_KEY` 必须通过 `wrangler secret put` 设置，不能直接写在 `wrangler.json` 中
2. 确保你的域名 `wujunbo.top` 已在 Resend 中验证
3. 邮件发送地址为 `noreply@wujunbo.top`
