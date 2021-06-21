# Chrome T-Rex Game

# 凡尔赛语录

[![ci](https://github.com/justjavac/deno_deploy_versailles/actions/workflows/ci.yml/badge.svg)](https://github.com/justjavac/deno_deploy_versailles/actions/workflows/ci.yml)

凡尔赛语录。部署在 [Deno Deploy](https://deno.com/deploy)。

> 用最低调的话，炫最高调的耀

## 本地开发

1. 安装 `deployctl`:

```bash
deno install -Afr --no-check https://deno.land/x/deploy/deployctl.ts
```

1. 启动本地开发服务器：

```bash
deployctl run --watch ./main.ts
```

### License

[deno_deploy_versailles](https://github.com/justjavac/deno_deploy_versailles) is
released under the MIT License. See the bundled [LICENSE](./LICENSE) file for
details.
