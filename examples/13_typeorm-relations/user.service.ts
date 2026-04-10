import { Repository } from "typeorm";

import { Injectable, NotFoundException } from "../../src/index.js";
import { AppDataSource } from "./data-source.js";
import { Post } from "./entities/post.entity.js";
import { User } from "./entities/user.entity.js";

@Injectable()
export class UserService {
	#users: Repository<User>;
	#posts: Repository<Post>;

	constructor() {
		this.#users = AppDataSource.getRepository(User);
		this.#posts = AppDataSource.getRepository(Post);
	}

	async createUser(name: string, email: string): Promise<User> {
		const user = this.#users.create({ name: name, email: email });
		return this.#users.save(user);
	}

	async findAllUsers(): Promise<User[]> {
		return this.#users.find();
	}

	async findUserWithPosts(id: string): Promise<User> {
		const user = await this.#users.findOne({
			where: { id: id },
			relations: { posts: true },
		});
		if (!user) throw new NotFoundException("User not found");
		return user;
	}

	async createPost(userId: string, title: string, body: string): Promise<Post> {
		const user = await this.#users.findOneBy({ id: userId });
		if (!user) throw new NotFoundException("User not found");

		const post = this.#posts.create({
			title: title,
			body: body,
			authorId: userId,
			author: user,
		});
		return this.#posts.save(post);
	}

	async findPostsByUser(userId: string): Promise<Post[]> {
		const user = await this.#users.findOneBy({ id: userId });
		if (!user) throw new NotFoundException("User not found");

		return this.#posts.find({ where: { authorId: userId } });
	}

	async updatePost(userId: string, postId: string, data: Partial<Pick<Post, "title" | "body" | "published">>): Promise<Post> {
		const post = await this.#posts.findOne({
			where: { id: postId, authorId: userId },
		});
		if (!post) throw new NotFoundException("Post not found");

		Object.assign(post, data);
		return this.#posts.save(post);
	}

	async deletePost(userId: string, postId: string): Promise<void> {
		const post = await this.#posts.findOne({
			where: { id: postId, authorId: userId },
		});
		if (!post) throw new NotFoundException("Post not found");

		await this.#posts.remove(post);
	}

	async findPublishedPosts(): Promise<Post[]> {
		return this.#posts.find({
			where: { published: true },
			relations: { author: true },
			order: { createdAt: "DESC" },
		});
	}
}
