import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryGeneratedColumn,
} from "typeorm";
import type { User } from "./user.entity.js";

@Entity("posts")
export class Post {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column()
	title!: string;

	@Column("text")
	body!: string;

	@Column({ default: false })
	published!: boolean;

	@CreateDateColumn()
	createdAt!: Date;

	@ManyToOne("User", (user: User) => user.posts, { nullable: false, onDelete: "CASCADE" })
	author!: User;

	@Column()
	authorId!: string;
}
