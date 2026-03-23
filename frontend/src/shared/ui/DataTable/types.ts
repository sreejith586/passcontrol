export interface DataTableColumn<T> {
  key: string;
  header: string | React.ReactNode;
  render: (row: T) => React.ReactNode;
  width?: string;
}
