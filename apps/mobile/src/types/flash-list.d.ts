declare module '@shopify/flash-list' {
  import * as React from 'react';
  import type { FlashListProps as BaseProps } from '@shopify/flash-list/dist/FlashListProps';

  export interface FlashListProps<T> extends BaseProps<T> {
    estimatedItemSize?: number;
  }

  export class FlashList<T> extends React.Component<FlashListProps<T>> {}
}
