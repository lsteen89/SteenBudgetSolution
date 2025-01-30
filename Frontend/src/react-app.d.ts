declare module '*.svg?react' {
  import { ReactComponent } from '*.svg';
  const content: ReactComponent;
  export default content;
}