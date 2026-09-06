# 参与贡献

<p align="center"><img src="docs/assets/pantheon/doc-contributing.png" alt="一根金色别针竖着穿过摊开的大理石册页，旁边是大理石桌上一摞薄薄的大理石片" width="100%"></p>

谢谢你来看。这个项目是故意做小的：裸 Node 上的三个文件，没有依赖，没有构建步骤。任何改动都要尊重这个约束。

## 流程

先 fork 仓库，建一个分支 branch，提交 commit，推送 push，然后开一个 Pull Request。请不要直接向 `main` 推送，发布闸门会拒绝。

## 开 Pull Request 之前

把三个检查都跑一遍。它们很快，而且就是全部的评审契约：

```bash
node scripts/koiz.mjs --selftest     # 仪器的逻辑
node scripts/koiz-mutate.mjs         # 19 条被打断的规则，每一条都必须被抓到
bash scripts/koiz-acceptance.sh      # 完整验收，十项
```

验收变红，说明改动还没做完。加了新逻辑而自检没有变化、验收却是绿的，说明自检还没覆盖这段逻辑，正确的做法是补一条变异，而不是高兴。

## 新逻辑要带上自己的变异

`scripts/koiz-mutate.mjs` 每次打断一条规则，并要求自检发现它。你加了一个分支，就补上打断它的那条变异。没人能故意打断的规则，也就没人在检查。

## 风格

注释解释原因，不复述代码。注释里的测量要带上数字。函数短，嵌套浅，用提前返回代替一层层的条件。散文和注释用俄语，CLI 命令和 API 名字用英文。

## 会被拒绝的改动

加依赖。加构建步骤。改日志格式导致读不了旧记录。让仪器去访问网络。这些不是风格之争：每一条都拿掉了这个项目赖以存在的一个性质。

## 刻字用的字体

工作流程图上的字由 `podpisi_takta.py` 用 Cormorant 字体（SIL 开放字体许可证）刻上去。字体没有放进仓库；如果你要重新生成这张图，请从 https://fonts.google.com/specimen/Cormorant 装到 `~/Library/Fonts`。
