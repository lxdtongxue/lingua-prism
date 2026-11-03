# 腾讯云自动部署

推送 `main` 后，GitHub Actions 分别部署 GitHub Pages 和腾讯云。也可在 Actions 的 **Deploy to Tencent Cloud** 页面手动运行。

腾讯云构建使用 Node.js 24 与 `--base=/`，不需要在服务器安装 Node.js。工作流使用专用账号 `lingua-deploy`，不使用 root 密钥。

仓库 Actions Secrets：

- `TENCENT_HOST`：服务器地址。
- `TENCENT_DEPLOY_KEY`：专用 SSH 私钥。
- `TENCENT_KNOWN_HOSTS`：经已有可信 SSH 连接核验的服务器主机公钥，工作流严格检查主机身份。

服务器公开目录 `/var/www/lingua-prism` 指向 `/var/www/lingua-prism-auto/current`。新文件上传至 `releases/<提交>-<运行>-<重试>`，验证入口后切换 `current` 符号链接；首页健康检查失败时回退。已有页面使用的旧版 assets 会保留在新版本中。

首次接入前的完整网站保存在 `/var/www/lingua-prism-before-auto-*`，自动发布的历史文件夹保留在 `releases`。需定期检查磁盘空间，手动清理不用的旧版本，勿删除 `current` 指向的目录。

回退时，可通过管理员 SSH 进入 `/var/www/lingua-prism-auto`，将 `current` 原子切换至已确认的历史 release。原有 `deploy.sh` 是旧的手工部署脚本；启用自动部署后请使用本工作流，不要混用。
