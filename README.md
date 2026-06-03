# ChatGPT 图片提示词模板生成器

这是基于现有单文件提示词模板系统迁移出的 GitHub Pages 静态版本，重点适配 iPhone Safari。

## 技术栈

- Vite
- React
- TypeScript
- 纯前端 `localStorage`
- 无后端、无数据库

## 本地安装

```bash
npm ci
```

## 本地开发启动

```bash
npm run dev
```

启动后在浏览器访问终端显示的本地地址。手机同局域网访问时，可使用电脑局域网 IP 加端口。

## 本地构建

```bash
npm run build
```

构建产物会生成到 `dist/`。

## 推送到 GitHub

```bash
git init
git add .
git commit -m "Initial prompt mobile tool"
git branch -M main
git remote add origin https://github.com/<你的用户名>/prompt-moblie-tool.git
git push -u origin main
```

## GitHub Pages 设置

1. 打开仓库 Settings。
2. 进入 Pages。
3. Source 选择 GitHub Actions。
4. 推送到 `main` 后，`.github/workflows/deploy.yml` 会自动执行：
   - `npm ci`
   - `npm run build`
   - 发布 `dist` 到 GitHub Pages

当前 `vite.config.ts` 的 `base` 是：

```ts
base: "/prompt-moblie-tool/"
```

如果仓库名不是 `prompt-moblie-tool`，请把 `base` 改成实际仓库名，例如：

```ts
base: "/你的仓库名/"
```

同时修改 `public/manifest.webmanifest` 里的 `start_url`。

## iPhone 访问

部署后访问地址格式：

```text
https://<你的用户名>.github.io/prompt-moblie-tool/
```

## iPhone 添加到主屏幕

1. 用 iPhone Safari 打开部署地址。
2. 点击底部分享按钮。
3. 选择“添加到主屏幕”。
4. 确认名称后添加。

## 如何更新模板内容

有两种方式：

1. 在页面中点击当前模板的“编辑”，修改后保存。数据会保存到浏览器 `localStorage`。
2. 修改源码中的 `src/templates.ts`，提交并重新部署。此方式适合更新默认模板。

## GitHub Pages 限制

GitHub Pages 只能运行静态前端，因此当前版本只支持：

- 本地图片预览，不上传服务器
- 本地 `localStorage` 保存
- JSON 导入导出

以后如果需要跨设备同步、团队共享模板、长期保存图片或用户权限管理，需要增加服务器和数据库。
