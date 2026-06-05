# ChatGPT 图片提示词模板生成器

这是一个可部署到 GitHub Pages 的纯前端手机端版本，重点适配 iPhone Safari。数据保存在浏览器 `localStorage` 中，不需要后端和数据库。

## 技术栈

- Vite
- React
- TypeScript
- localStorage
- GitHub Pages / GitHub Actions

## 本地安装

```bash
npm ci
```

## 本地开发

```bash
npm run dev
```

Vite 本地开发地址通常为：

```text
http://127.0.0.1:5173/prompt-moblie-tool/
```

如果终端显示了其他端口，请以终端输出为准。

## 本地构建

```bash
npm run build
```

构建产物会生成到 `dist/`。

## GitHub Pages 配置

当前 GitHub 仓库名为 `prompt-moblie-tool`，因此 `vite.config.ts` 中应保持：

```ts
base: "/prompt-moblie-tool/"
```

`public/manifest.webmanifest` 中的 `start_url` 和 `scope` 也应保持：

```json
"/prompt-moblie-tool/"
```

仓库 Settings -> Pages 中，Source 选择 GitHub Actions。推送到 `main` 后，`.github/workflows/deploy.yml` 会自动执行：

- `npm ci`
- `npm run build`
- 发布 `dist` 到 GitHub Pages

## iPhone 访问

部署后的访问地址格式：

```text
https://lavine0827-blip.github.io/prompt-moblie-tool/
```

## 添加到 iPhone 主屏幕

1. 用 iPhone Safari 打开 GitHub Pages 地址。
2. 点击底部分享按钮。
3. 选择“添加到主屏幕”。
4. 确认名称后添加。

## 更新模板内容

有两种方式：

1. 在页面里编辑模板，数据会保存在当前浏览器的 `localStorage`。
2. 修改源码中的 `src/templates.ts`，提交并重新部署，用于更新默认模板。

## GitHub Pages 限制

GitHub Pages 只能运行静态前端，因此当前版本支持：

- 图片本地选择和预览，不上传服务器
- 变量和最终提示词本地保存
- 模板 JSON 导入导出

如果以后需要跨设备同步、团队共享模板、长期保存图片或用户权限管理，需要增加服务器和数据库。
