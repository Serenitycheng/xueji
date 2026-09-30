import type {
  Curriculum,
  CurriculumSource,
  CurriculumStep,
  CurriculumUnit,
} from '../curriculum';

function source(
  label: string,
  url: string,
  locator: string,
  status = '主资源',
): CurriculumSource {
  return { label, url, locator, status };
}

function step(
  id: string,
  title: string,
  action: string,
  done: string,
  ...sources: CurriculumSource[]
): CurriculumStep {
  return { id, title, action, done, sources, optional: false };
}

const githubFlow = source(
  'GitHub Docs｜编写和保存代码',
  'https://docs.github.com/en/get-started/start-your-journey/writing-and-storing-your-code',
  '分支、修改、提交、推送和检查；按需选读，不必照做示例项目',
);
const gitBook = source(
  'Pro Git 中文版',
  'https://git-scm.com/book/zh/v2',
  '第1—3章：基本操作、记录改动、分支；随用随查',
);
const googleML = source(
  'Google 机器学习速成课',
  'https://developers.google.com/machine-learning/crash-course',
  '选读神经网络、Embedding 和大语言模型模块；第一遍只求理解',
);
const hfLLM = source(
  'Hugging Face LLM Course',
  'https://huggingface.co/learn/llm-course/en/chapter1/1',
  '第1章 Transformer 基础；第2章只选模型和 Tokenizer 相关内容',
);
const hfAgents = source(
  'Hugging Face Agents Course',
  'https://huggingface.co/learn/agents-course/unit1/introduction',
  'Unit 1：模型、工具、行动和 Agent 循环；第一遍不要求编写 Agent',
);
const datawhaleLLM = source(
  '人大高瓴 × Datawhale｜大模型技术基础（B站）',
  'https://www.bilibili.com/video/BV1GaRKYmEsD/',
  '2025 年课程第 1.2 讲；需要中文讲解时选看',
  '中文视频补充',
);

export const developmentFirstPassUnits: CurriculumUnit[] = [
  {
    id: 'DEV-UPROCESS',
    title: '开发流程线｜用真实项目学会做事',
    goal: '先用 1—2 周走通一轮小改动，之后在序流、学序或自己的其他项目中持续使用；重点是需求、验收、检查和发布。',
    prerequisites: '现在就可以开始；与 AI 认知第一遍并行',
    branch: '开发流程线',
    steps: [
      step(
        'DEV-PROC-01',
        '看懂一轮开发流程',
        '选一个自己项目的近期改动，串起问题→需求→方案→实现→验证→发布→观察。',
        '能说清每一环在防止什么问题，并指出这个改动目前走到哪一步。',
        githubFlow,
      ),
      step(
        'DEV-PROC-02',
        '写需求和验收标准',
        '为真实的小功能写一两句目的，再列正常、空输入或错误情况的可检查结果。',
        '在让 AI 修改前，能用这份简短清单判断功能是否完成。',
        source(
          'GitHub Docs｜用 Issue 跟踪工作',
          'https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/about-issues',
          '了解任务描述与检查项；直接用现有项目，不必建立额外管理流程',
        ),
      ),
      step(
        'DEV-PROC-03',
        '看方案并拆小任务',
        '让 AI 说明要改哪些文件、数据怎么流动、每一步怎么验证；把过大的改动拆开。',
        '能指出无关改动或遗漏的验证，并把一个大任务拆成可单独检查的步骤。',
        githubFlow,
      ),
      step(
        'DEV-PROC-04',
        '分清本地、Git 和线上',
        '在自己的仓库查看当前目录、git status、git diff 和最近提交，画出本地→GitHub→线上关系。',
        '能解释工作区、提交、远程仓库的区别，知道改动前后如何保留版本。',
        gitBook,
        source(
          'PowerShell 官方入门',
          'https://learn.microsoft.com/en-us/powershell/scripting/learn/ps101/01-getting-started',
          '卡在路径或目录命令时选读',
        ),
      ),
      step(
        'DEV-PROC-05',
        '与 AI 协作并检查改动',
        '按“需求→方案→小步实现→查看 diff”走一次真实修改；让 AI 解释文件职责和主要数据流。',
        '能说出哪些文件变了、为什么变，能发现明显无关的修改。',
        source(
          'GitHub Docs｜检查代码改动',
          'https://docs.github.com/en/get-started/start-your-journey/reviewing-your-proposed-changes',
          '重点看 Files changed 与逐项检查；对照本地 git diff',
        ),
      ),
      step(
        'DEV-PROC-06',
        '按验收标准验证',
        '针对刚才的功能检查正常、空输入、错误输入和刷新/重复操作；记下结果。',
        '不会只凭“页面能打开”判定完成；能指出至少一个未覆盖的边界。',
        source(
          'pytest 官方入门',
          'https://docs.pytest.org/en/stable/getting-started.html',
          '先理解测试与断言；Python 自动测试可在 07 再动手',
        ),
      ),
      step(
        'DEV-PROC-07',
        '发布后观察与回滚',
        '在自己的项目里查一次提交、远程仓库和部署状态；区分构建失败与线上功能错误。',
        '能找到当前线上版本；出错时知道先定位问题或恢复上一个可靠版本。',
        source(
          'Vercel 官方部署文档',
          'https://vercel.com/docs/deployments',
          '以学序当前部署为例；其他项目按实际平台查官方文档',
        ),
      ),
      step(
        'DEV-PROC-08',
        '形成轻量项目检查单',
        '从以上步骤留一份简短记录：目的、验收、改动、验证、提交/发布、回滚方式。只用于明显功能或重要修复。',
        '下一次真实改动能复用这份检查单，不为微小改动填完整表格。',
        githubFlow,
      ),
    ],
  },
  {
    id: 'DEV-UAIMAP',
    title: 'AI认知线｜第一遍建立知识地图',
    goal: '先弄清模型、Agent 和评估是什么；第一遍以解释和判断为主，不要求训练模型或实现完整 Agent。',
    prerequisites: '可与开发流程线并行；公式卡住时先跳过，之后按需补数学',
    branch: 'AI认知线 · 第一遍',
    steps: [
      step(
        'DEV-AI-01',
        'AI、机器学习与大模型地图',
        '理清 AI→机器学习→深度学习→生成式 AI→LLM；解释 token、embedding、上下文、Transformer、Dense/MoE、训练和推理。',
        '能用自己的话讲出这些概念的关系，并区分模型、API 与本地运行。',
        googleML,
        datawhaleLLM,
      ),
      step(
        'DEV-AI-02',
        'LLM 为什么能工作及其边界',
        '用“输入→token→预测输出”解释生成过程；了解神经网络、loss、预训练/后训练、幻觉和上下文的作用。',
        '能解释为什么模型可能自信地出错，以及为什么换上下文会改变结果。',
        hfLLM,
        googleML,
      ),
      step(
        'DEV-AI-03',
        'AI 应用系统与 Agent',
        '画出模型、上下文、结构化输出、工具、RAG、记忆、MCP、Agent 和运行环境的分工；对照实际 coding 工具。',
        '能区分模型与 Agent，并说明 Tool Calling、RAG、MCP 各解决什么问题。',
        hfAgents,
        source(
          'MCP 官方架构概览',
          'https://modelcontextprotocol.io/docs/learn/architecture',
          '理解 Host、Client、Server 与工具/资源；第一遍不要求实现',
        ),
      ),
      step(
        'DEV-AI-04',
        '模型能力怎样评估',
        '比较两个模型在自己真实任务上的结果；读一次 SWE-bench 与 METR，留意任务、工具、时间、成本和评测条件。',
        '能说明为什么总分不能直接代表自己的使用效果，并列出自己的 3 个评估指标。',
        source(
          'SWE-bench 官方站',
          'https://www.swebench.com/',
          '真实软件工程任务与榜单；注意评测设置',
        ),
        source(
          'METR｜任务时间跨度',
          'https://metr.org/time-horizons/',
          'Agent 长任务能力的研究方法与限制',
        ),
      ),
      step(
        'DEV-AI-05',
        '低频跟踪 AI 前沿',
        '选一份年度报告和一家模型厂商的技术说明，记录能力、限制和测量方式；以后每周或双周回顾一次即可。',
        '面对新模型发布，知道查原始报告、任务表现、成本与限制，而不是只转述榜单。',
        source(
          'Stanford AI Index',
          'https://hai.stanford.edu/ai-index',
          '年度行业与能力趋势；按需选读，不追每日新闻',
        ),
      ),
      step(
        'DEV-AI-06',
        '第一遍回顾与进入基础线',
        '不看资料回答：模型如何输出、模型与 Agent 的区别、RAG/工具/MCP 的作用、如何判断模型；标出不懂的地方。',
        '能用自己的话答出主要问题；把暂时不会实现的部分留到 08→09A→09B 第二遍。',
        hfAgents,
      ),
    ],
  },
];

const foundationOrder = [
  'DEV-U01',
  'DEV-U03',
  'DEV-U02',
  'DEV-U04',
  'DEV-U05',
  'DEV-U06',
  'DEV-U07',
  'DEV-UWEB',
];
const secondPassOrder = ['DEV-U08', 'DEV-U09A', 'DEV-U09B'];
const unitGoals: Record<string, string> = {
  'DEV-U02':
    '理解程序、进程、内存和并发怎样运行，遇到卡顿或状态丢失时能初步定位。',
  'DEV-U03':
    '从第一天同步练环境、终端、调试和 Git，把每次项目改动变成可检查、可恢复的版本。',
  'DEV-U04': '理解常见数据结构与算法的取舍，用自己的项目数据验证效率和边界。',
  'DEV-U05': '看懂网址、HTTP、JSON 与接口调用，能追踪一次请求从输入到响应。',
  'DEV-U06': '用 SQL 保存、查询和维护真实项目数据，理解关系、约束与事务。',
  'DEV-U07':
    '把需求、模块、校验、测试和发布串成可维护的项目，逐渐独立判断质量。',
  'DEV-UWEB':
    '仅在自己的网页项目需要时补 HTML、CSS、JavaScript、TypeScript 与 React。',
  'DEV-U08':
    '第二遍动手理解数据、训练与验证，把第一遍的 AI 概念落实到最小实验。',
  'DEV-U09A': '第二遍实际调用大模型，验证输出、成本和上下文处理。',
  'DEV-U09B':
    '第二遍实现并评估检索、工具和 Agent 工作流，关注来源、权限与可靠性。',
};

export function extendDevelopmentCurriculum(base: Curriculum): Curriculum {
  const byId = new Map(base.units.map((unit) => [unit.id, unit]));
  const existing = [...foundationOrder, ...secondPassOrder].map((id) => {
    const unit = byId.get(id);
    if (!unit) throw new Error(`Missing development unit: ${id}`);
    return {
      ...unit,
      goal: unitGoals[id] ?? unit.goal,
      branch: secondPassOrder.includes(id) ? 'AI认知线 · 第二遍' : '开发基础线',
      steps: unit.steps.map((lesson) => ({
        ...lesson,
        // The personal plan remains in the resource library; each lesson links directly to its course.
        sources: lesson.sources.filter(
          (item) => item.url !== '/api/development-plan',
        ),
      })),
    };
  });
  if (byId.size !== existing.length)
    throw new Error('Unmapped development unit');
  return {
    ...base,
    goal: '先用开发流程和 AI 认知建立地图，再以 Python 与开发工具为起点补基础，最后回到 AI 应用实践。',
    notes: [
      '开发流程线和 AI 认知线先并行过第一遍；学到基础后，再学 08→09A→09B。遇到项目问题可以提前查看对应节点，不锁定顺序。',
      ...base.notes,
    ],
    units: [...developmentFirstPassUnits, ...existing],
  };
}
