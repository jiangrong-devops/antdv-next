export {}

declare module 'vue' {
  export interface GlobalComponents {
    AScrollbar: typeof import('@antdv-next/pro')['Scrollbar']
  }
}
