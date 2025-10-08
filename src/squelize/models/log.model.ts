import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'logs',
  timestamps: true,
})
export class Logs extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
    allowNull: false,
  })
  data: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  log: string;
}
