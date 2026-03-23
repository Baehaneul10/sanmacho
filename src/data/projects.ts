export type Project = {
  id: string;
  title: string;
  description: string;
  stack: string[];
  /** SPA 내부 라우트 이름 (예: reaction-game). 있으면 Demo는 RouterLink로 연결 */
  demoRoute?: string;
  demoUrl?: string;
  repoUrl?: string;
};

export const projects: Project[] = [
  {
    id: "sample-1",
    title: "반응속도 미니게임",
    description:
      "Vue3로 만든 반응속도 미니게임입니다. 화면이 초록으로 바뀌는 순간 클릭해 반응 시간(ms)을 재고 세션 동안 최고 기록을 저장합니다.",
    stack: ["Vue 3", "TypeScript", "Composition API"],
    demoRoute: "reaction-game",
    repoUrl: "https://github.com",
  },
  {
    id: "sample-2",
    title: "가계부 (데모)",
    description: "지출을 기록하면 상태가 바뀌는 가벼운 게임 UI입니다.",
    stack: ["Vue 3", "Pinia", "TypeScript", "localStorage"],
    demoRoute: "spending-city",
    repoUrl: "https://github.com",
  },
];
