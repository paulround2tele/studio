declare module 'react-window' {
  import * as React from 'react';
  export interface ListChildComponentProps<T = any> {
    index: number;
    style: React.CSSProperties;
    data: T;
  }
  export interface FixedSizeListProps<T = any> {
    height: number;
    width: number | string;
    itemCount: number;
    itemSize: number;
    itemData?: T;
    className?: string;
    children: (props: ListChildComponentProps<T>) => React.ReactNode;
  }
  export class FixedSizeList<T = any> extends React.Component<FixedSizeListProps<T>> {}
  export { FixedSizeList as List, FixedSizeList as VariableSizeList };
  export { ListChildComponentProps };
  export { FixedSizeList as default };
}