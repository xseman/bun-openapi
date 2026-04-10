import {
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryGeneratedColumn,
} from "typeorm";
import type { Post } from "./post.entity.js";

@Entity("users")
export class User {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column()
	name!: string;

	@Column({ unique: true })
	email!: string;

	@CreateDateColumn()
	createdAt!: Date;

	@OneToMany("Post", (post: Post) => post.author, { cascade: true })
	posts!: Post[];
}
