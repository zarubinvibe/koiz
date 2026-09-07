# Koiz

Koiz 用一份教训库管住所有项目：失败的原因没有被机制关掉，工作就停在那里。

[English](README.md) · [Русский](README.ru.md)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![Stars](https://img.shields.io/github/stars/zarubinvibe/koiz?style=flat&color=C9A87A)](https://github.com/zarubinvibe/koiz/stargazers) [![Status](https://img.shields.io/badge/status-in%20use-brightgreen.svg)](https://github.com/zarubinvibe/koiz) [![Olympuz](https://img.shields.io/badge/olympuz-family-B8D6EA.svg)](https://github.com/zarubinvibe/athena#olympuz-family)

<p align="center"><img src="docs/assets/pantheon/hero.png" alt="白色大理石的科俄斯站在古典石柱旁，右手竖握轴杖，掌上摊开的大理石册页被一根金色别针穿透，蓝色路径在日光下汇到他脚边" width="100%"></p>

<!-- owner-welcome:start -->

> 你好，我是 Fil。
>
> 我做 Koiz，是因为同一个坑连着第三个项目又踩了一次。教训其实写过，它躺在另一个仓库、另一份日志里，没人在需要的时候读到。
>
> 试试看。坏了就到 Issues 里写，我会读。有用就点个星标，再拿给同时管好几个项目的人看看。Olympuz 的其他项目在这里：https://zarubinvibe.com
>
> — Filipp Zarubin

<!-- owner-welcome:end -->

## 目录

- [这是什么](#这是什么)
- [它解决什么问题](#它解决什么问题)
- [最大的优势](#最大的优势)
- [工作流程](#工作流程)
- [快速开始](#快速开始)
- [简单对比](#简单对比)
- [简单词汇](#简单词汇)
- [安全与隐私](#安全与隐私)
- [局限](#局限)
- [点亮星标与参与](#点亮星标与参与)

<!-- beginner-readme:start -->

## 这是什么

Koiz 为你所有的项目保存同一份教训库。一份日志，一个检索键，一套纪律。

教训是被追问进来的，不是被复述进来的：什么坏了、怎么复现、为什么会这样、被什么钉住。最后那一项才是关键。只要它写着"没有"，这条教训就没有完成。

它也不等你想起它。命令一失败，Koiz 当场把这桩麻烦记下来；如果以前发生过，它会把现成的修法一并放在旁边。

## 它解决什么问题

错误很少是新的。它半年前在另一个项目里已经发生过，当时也写了结论。那条记录留在那个项目的日志里，而今天你的手在另一个仓库上，没人记得它存在。

再往后更麻烦。教训越堆越多，重复的不合并，过期的不标注。一年之后就是一堵没人读的文字墙，等于没有。

## 最大的优势

**最大的优势：** 教训靠机制关掉，不靠决心。

**为什么这样更好：** 写成文字的规则，人读了、点头了，照样按老样子做。机制不提建议：钩子、禁令、仪器或测试，直接不让它发生第二次。

Koiz 在写入时就要求你说出机制，未被钉住的教训再次出现时会把闸门变红，而当你敲下同一类命令的那一秒，它就开口。不是在复盘之后，是在之前。

## 工作流程

五步，智能体自己走完：采集失败、追出原因、固定到机制、合并相似、关上闸门。机器负责取走磁盘上看得见的部分，人只补上意义。

<!-- workflow-diagram:start -->

<p align="center"><img src="docs/assets/pantheon/takt-zh.png" alt="五块大理石板排成一行，每块刻着一个阶段，一条从左边进来的金色丝线把它们串起来" width="100%"></p>

<!-- workflow-diagram:end -->

| 阶段 | 会发生什么 |
|---|---|
| 1. 采集 | 会话结束时，机器直接从磁盘上把失败取下来，一个字都不用手打。 |
| 2. 追因 | 智能体补上机器不可能知道的那一项：为什么会这样。 |
| 3. 固定 | 教训被绑到一个让重复不可能发生的机制上。 |
| 4. 归并 | 相似的教训在单独一趟里合成一条规则。 |
| 5. 闸门 | 没有固定的重复会拦住工作，而不是变成一条笔记。 |

### 第 1 步：采集失败

`SessionEnd` 钩子把刚结束的会话记录交给仪器。仪器只取磁盘能证明的东西：失败的命令、退出码、被拒的闸门、重试了几次。

守卫正常工作 不算失败。已经拦住的阻断，以及短于三个实义词的证据，都不会进库。否则欠账会无缘无故把闸门染红。

<p align="center"><img src="docs/assets/pantheon/stage-capture.png" alt="大理石桌上放着一摞薄薄的大理石片，蓝色路径从画面左边一直连到桌前" width="100%"></p>

**你会得到：** 一批草稿教训，全程没有手打一行。

### 第 2 步：追出原因

采集来的草稿里，「为什么」是空的。原因没查出来，这条教训就没做完，也不会作为成品被检索到。

顺序很重要，反过来不成立。事实由机器取，意义由人或智能体补。让智能体去猜事实，写出来的是很像样的假话。

<p align="center"><img src="docs/assets/pantheon/stage-cause.png" alt="科俄斯举着轴杖，低头看着摊在自己掌上的那本大理石册页" width="100%"></p>

**你会得到：** 一条带原因的教训，而不是一句症状描述。

### 第 3 步：固定到机制

固定这一栏只收五个值：`hook`、`deny`、仪器、测试，以及「没有」。自造的值会被拒绝，没有指向具体文件或命令的固定也不收。

「没有」是合法值，也是诚实的承认。它说明机制还不存在，而正是它，之后会把这条教训抬成一笔欠账。

<p align="center"><img src="docs/assets/pantheon/stage-pin.png" alt="一根金色别针笔直穿过摊开的大理石册页，针头立在纸面之上" width="100%"></p>

**你会得到：** 一条能看清楚是什么在拦住重复的记录。

### 第 4 步：归并成规则

写入时顺手合并既贵又会丢数据，所以它被拆成了一条单独的命令。`collapse` 找出三条相似的教训，提出一条共同规则，并把合了什么摊开给你看。

过期的教训不会被删掉。它按日期关闭，留在历史里。它不是假话，只是不再生效了。

<p align="center"><img src="docs/assets/pantheon/stage-collapse.png" alt="三片薄薄的大理石片在大理石桌上汇成一片更厚的石片" width="100%"></p>

**你会得到：** 三条记录变成一条规则，库也不会无止境地长下去。

### 第 5 步：闸门拦住工作

`gate` 命令在教训回来、而固定栏还写着「没有」时，以非零码退出。在作者那边，这条命令挂在夜间流程上，已经真的把夜里的活儿拦下来过。

出路有两条，都很诚实：用机制关掉它，或者承认这条规则不成立，按日期关掉。要延期就得写上日期和理由。

<p align="center"><img src="docs/assets/pantheon/stage-gate.png" alt="一块竖立的大理石板，中间开着一个干净的长方形通孔，立在大理石桌上" width="100%"></p>

**你会得到：** 一次没法默默绕过去的重复。

## 快速开始

需要 Git、Node 20 或更新的版本，以及三种入口里的任意一种：Claude Code、Codex CLI，或者一个普通终端。

```bash
git clone https://github.com/zarubinvibe/koiz.git
cd koiz
bash install.sh

# без git, одним архивом:
curl -L https://github.com/zarubinvibe/koiz/archive/refs/heads/main.zip -o koiz.zip

# дальше открывайте, чем привычнее:
claude          # Claude Code: скажите /koiz-setup, установка пройдет разговором
codex           # Codex CLI: правила проекта уже лежат в AGENTS.md
code .          # VS Code: агент открывается внутри редактора
```

上面三行就是全部安装。`bash install.sh` 建好库、把观察者装到每个工具上、把采集装到会话结束，每一步之前都会征求你的同意。它不需要智能体，一个终端就够。

**Claude Code。** 在这个目录里运行 `claude`，然后说 `/koiz-setup`。安装以对话进行，一次一个问题。

**Codex CLI。** 在同一目录运行 `codex`。项目规则已经写在 `AGENTS.md` 里。

**完全不用智能体。** `node scripts/koiz.mjs ask "以前坏过什么"` 会告诉你库里关于这个问题知道些什么，并且什么都不安装。`koiz next` 说出该先钉住哪一条，`koiz graph` 生成那张图——以后你走图，而不是通读整个库。

第一次做这件事？[上手引导](docs/ONBOARDING.zh.md) 会一步一步带你走完第一次运行，并写清楚每条命令之后你会看到什么。

**你会得到：** 教训库建好了，采集挂在会话结束上，`node scripts/koiz.mjs debt` 会告诉你哪条教训又回来了、而且到现在还没有任何机制拦着它。

## 简单对比

| 方案 | 这是什么 | 教训存在哪里 | 能否作用于别的项目 | 是否要求机制 | 会不会拦住工作 | 价格 |
|---|---|---|---|---|---|---|
| **Koiz** | 带强制固定的教训库 | 你自己磁盘上的一份日志 | 能，检索键是错误类别，不是仓库名 | 要，固定这一栏必须填 | 会，没固定的重复会让闸门变红 | 自己的工具，免费 |
| 手写复盘 | 一次糟糕会话之后的笔记 | 写在哪儿就在哪儿 | 不能 | 不要 | 不会 | 每次复盘花掉你的时间 |
| `CLAUDE.md` 和 `AGENTS.md` | 写在仓库里的文字规则 | 写在哪个项目就在哪个项目 | 不能，文件只活在一棵树里 | 不要 | 不会 | 免费 |
| Cursor Rules | 交给智能体的编辑器规则 | 项目设置里 | 不能 | 不要 | 不会 | 包含在订阅里 |
| mem0 | 智能体记忆：事实和偏好 | 自己的存储或云端 | 能，前提是项目共用一份记忆 | 不要 | 不会 | 开源，云端收费 |
| Letta | 带记忆和有限上下文块的智能体 | 自己的数据库 | 部分能 | 不要 | 不会 | 开源 |
| Zep 和 Graphiti | 记忆图谱，事实带有生效区间 | 自己的服务 | 能 | 不要 | 不会 | 开源，云端收费 |

名称归各自所有者。这张表描述的是用途，不是实测：别人的产品会变，这个页面不替它们做承诺。

## 简单词汇

| 词 | 简单解释 |
|---|---|
| Repository | 仓库：Git 保存并记录版本的项目文件夹 |
| Terminal | 终端：你输入命令的窗口 |
| Command | 命令：给电脑的一条指令 |
| Branch | 分支：不影响 `main` 的另一条修改线 |
| Pull Request | 合并请求：请别人审阅并接受你的修改 |
| Lesson | 教训：被追到原因的失败，并带着关上重复的那个机制 |
| Pin | 钉住：被点名的机制——钩子、禁令、仪器或测试——让重复不可能发生 |
| Collapse | 合并：把相似的教训并成一条规则的独立一趟 |
| Guard | 提示：教训在同类命令之前浮现，而不是在摔倒之后 |
| Graph | 教训图：用节点和连线代替通读整个库，走图不花钱 |

## 安全与隐私

- 所有教训都在你自己的磁盘上，只有一个文件。什么都不会外发：这个仪器没有网络，也没有依赖。
- 密钥过滤放在写入这一侧，不是读取这一侧。令牌、密钥和私钥在进入日志之前就被切掉。
- 教训库放在项目仓库之外：教训里带着路径和别人项目的名字，公开的代码树不是它该待的地方。
- 日志只追加。写错的记录用日期关掉，它连同关闭原因一起留在历史里。
- 仪器直接从源码运行，不用装任何包：裸 Node 上的三个文件。
- 采集在你自己的机器上读会话记录，不会把它复制到任何地方。

到底什么会进到库里、发现漏洞往哪里写，都在 [SECURITY.zh.md](SECURITY.zh.md) 里。

## 局限

状态：日常在用。作者的库里有近一百条在用的教训，其中二十条已被机制关上；闸门装在夜间流程里，并且已经因为一条未被钉住的重复而拦下过它。

- 重复靠机器采集的指纹识别。两条用不同措辞写下同一件事的散文教训，仪器不会合并。
- 原因由人或智能体补上。机器只取磁盘上看得见的部分：返回码、失败的命令、闸门的拒绝。它当场就问，但答案仍然是你的。
- 动作之前的提示按命令触发。根本没有命令的麻烦，只能在复盘时浮现。
- 合并只提出规则，决定权留给你：它作为独立的一趟运行，并明确显示合并了什么。没有追出原因的素材，它不碰。
- 采集在 Claude Code 的记录上验证过。其他智能体 CLI 的日志格式不同，需要各自的解析。
- Windows 尚未验证。

更深入：[上手引导](docs/ONBOARDING.zh.md) 一步一步带你走完第一次运行，[工作原理](docs/HOW-IT-WORKS.zh.md) 把每个阶段都拆开讲。

## 点亮星标与参与

觉得有用？给 Koiz 点亮星标：[https://github.com/zarubinvibe/koiz](https://github.com/zarubinvibe/koiz)。这只要一秒，却决定别人能不能找到这个项目。

想改点什么？流程很短：先 fork 仓库，建一个分支 branch，提交 commit，推送 push，然后开一个 Pull Request。请不要直接向 `main` 推送，发布闸门会拒绝。

发现问题？到 [https://github.com/zarubinvibe/koiz/issues](https://github.com/zarubinvibe/koiz/issues) 开一个 issue，写清楚你运行了什么、发生了什么。

<!-- beginner-readme:end -->

<!-- pantheon-family:start -->
## Olympuz 家族

这是 [Olympuz 家族](https://github.com/zarubinvibe/athena#olympuz-family) 的公开项目之一。表格里的每一行都可以打开仓库，或者直接下载源码压缩包。

| 类型 | 名称 | 做什么 | 如何帮到这个项目 | 获取 |
|---|---|---|---|---|
| 项目 | Athena | 可携带的智能体操作系统：在新的 Mac 上重建 Claude 与 Codex 的工作环境。 | 把 Koiz 随工作环境一起带上：教训库和它的钩子一次就落到新机器上。 | [仓库](https://github.com/zarubinvibe/athena) · [ZIP](https://github.com/zarubinvibe/athena/archive/refs/heads/main.zip) |
| 项目 | Helioz | 全天候的智能体工作传送带，带可验证的完成标记和按目标做出的夜间决策。 | 在夜间流程前调用 Koiz 的闸门：未被钉住的重复会把夜里的运行拦下来。 | [仓库](https://github.com/zarubinvibe/helioz) · [ZIP](https://github.com/zarubinvibe/helioz/archive/refs/heads/main.zip) |
| 项目 | Mnemazine | 本地优先的记忆系统：把原始材料变成可复用的、已核验的知识。 | 以带反向链接的笔记接收教训，教训库因此进入共享的知识图谱。 | [仓库](https://github.com/zarubinvibe/mnemazine) · [ZIP](https://github.com/zarubinvibe/mnemazine/archive/refs/heads/main.zip) |
| 项目 | Themiz | 面向俄罗斯诉讼的多智能体助手，本地识别扫描件，五位法学家组成合议审阅。 | 为 Koiz 提供真实失败的来源：法务流水线出问题的方式和工具链不一样。 | [仓库](https://github.com/zarubinvibe/themiz) · [ZIP](https://github.com/zarubinvibe/themiz/archive/refs/heads/main.zip) |
| 项目 | Zeuz | 工作流工厂：把一个想法变成带规则、闸门、可观测性和回放的多智能体系统。 | 把 Koiz 的闸门接进它搭建的工作流：教训关掉一个步骤，而不是躺在报告里。 | [仓库](https://github.com/zarubinvibe/zeuz) · [ZIP](https://github.com/zarubinvibe/zeuz/archive/refs/heads/main.zip) |
| 项目 | Lynceuz | 以零成本收集公开网页证据；安全路径走完时，它会给出诚实的理由并停下。 | 向外找库里没有的东西：在你自己追因之前，先找到别人对同一麻烦的记录。 | [仓库](https://github.com/zarubinvibe/lynceuz) · [ZIP](https://github.com/zarubinvibe/lynceuz/archive/refs/heads/main.zip) |
| 项目 | Iriz | macOS 菜单栏听写：语音在你自己的 Mac 上解码，键盘布局自动纠正，口述可以直接变成给智能体的任务。 | 让你在失败的那一刻用口述说出原因——那时候打字太慢。 | [仓库](https://github.com/zarubinvibe/iriz) · [ZIP](https://github.com/zarubinvibe/iriz/archive/refs/heads/main.zip) |
| 项目 | Mantoz | 把一个想法摆到五百个并不存在的人面前，然后告诉你每个群体是怎么答的。 | 在读者身上检验教训的措辞：只有作者看得懂的规则不算规则。 | [仓库](https://github.com/zarubinvibe/mantoz) · [ZIP](https://github.com/zarubinvibe/mantoz/archive/refs/heads/main.zip) |
| 项目 | Koiz | 所有项目共用一份教训库。每次失败都追到原因，原因不被钩子、闸门或测试关掉，就一直挂在那里。 | 这就是它本身：教训库、失败当场的观察者，以及针对重复的闸门。 | [仓库](https://github.com/zarubinvibe/koiz) · [ZIP](https://github.com/zarubinvibe/koiz/archive/refs/heads/main.zip) |
<!-- pantheon-family:end -->

## 许可证

本项目以 [MIT 许可证](LICENSE) 提供。
