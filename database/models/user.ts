import { Table, Model, Column, DataType, PrimaryKey, Unique } from 'sequelize-typescript';

@Table({
  timestamps: false,
  tableName: 'user',
})

class User extends Model {
   @PrimaryKey
   @Column({ type: DataType.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true })
   ID!: number;

   @Unique
   @Column({ type: DataType.STRING, allowNull: false, unique: true })
   username!: string;

   @Column({ type: DataType.STRING, allowNull: false, defaultValue: '' })
   email!: string;

   @Column({ type: DataType.STRING, allowNull: false })
   password_hash!: string;

   @Column({ type: DataType.STRING, allowNull: false, defaultValue: '' })
   password_salt!: string;

   @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'viewer' })
   role!: string;

   @Column({ type: DataType.STRING, allowNull: true })
   created_at!: string;
}

export default User;
