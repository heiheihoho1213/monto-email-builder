# GitHub Pages 部署说明

## 配置步骤

1. **启用 GitHub Pages**
   - 进入仓库的 Settings > Pages
   - Source 选择 "GitHub Actions"

2. **Base 路径配置**
   - 默认情况下，workflow 会自动使用仓库名作为 base 路径（例如：`/editor-sample/`）
   - 如果需要使用根路径（`/`），修改 `.github/workflows/deploy-pages.yml` 中的 `VITE_BASE_PATH` 环境变量：
     ```yaml
     VITE_BASE_PATH: /
     ```

3. **触发部署**
   - 推送到 `main` 或 `master` 分支会自动触发部署
   - 也可以在 Actions 页面手动触发 workflow

## 注意事项

- 确保 `pnpm-lock.yaml` 文件已提交到仓库
- 首次部署可能需要几分钟时间
- 部署完成后，可以通过 `https://用户名.github.io/仓库名/` 访问

