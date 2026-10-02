/**
 * Seeds Threadly with demo users, a follow graph, posts, replies, hashtags and likes.
 * Usage: npm run db:seed   (WARNING: wipes existing data)
 */
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { extractHashtags } from "../src/lib/posts/parse";

try {
  process.loadEnvFile();
} catch {
  // No .env file; use the process environment.
}

const DEMO_PASSWORD = "Password123";
const MINUTE = 60 * 1000;

const client = postgres(
  process.env.DATABASE_URL ?? "postgres://threadly:threadly@localhost:5433/threadly",
  { max: 1 },
);
const db = drizzle(client, { schema });

function createRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = createRandom(7);
const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]!;
const sample = <T>(items: readonly T[], count: number) =>
  [...items].sort(() => random() - 0.5).slice(0, count);

const people = [
  ["demo", "Demo User", "Exploring Threadly. Say hi!"],
  ["ada", "Ada Lovelace", "First programmer. Big fan of analytical engines."],
  ["grace_h", "Grace Hopper", "It's easier to ask forgiveness than it is to get permission."],
  ["linus_t", "Linus T.", "Kernel hacker. Talk is cheap, show me the code."],
  ["margaret_h", "Margaret Hamilton", "Software engineering, before it had a name."],
  ["devon_codes", "Devon Park", "Frontend dev · React · design systems"],
  ["priya_dev", "Priya Sharma", "Backend engineer. Postgres enjoyer."],
  ["sam_ships", "Sam Rivera", "Indie hacker shipping small things."],
  ["nina_ux", "Nina Okafor", "Product designer. Accessibility advocate."],
  ["tom_ops", "Tom Becker", "SRE. If it isn't monitored, it isn't in production."],
  ["lea_ml", "Lea Martin", "ML engineer · training models, breaking GPUs"],
  ["omar_builds", "Omar Haddad", "Full-stack dev and coffee snob ☕"],
  ["yuki_t", "Yuki Tanaka", "Mobile dev. Swift by day, Kotlin by night."],
  ["carlos_dev", "Carlos Mendez", "TypeScript all the things."],
  ["zoe_writes", "Zoe Clarke", "Tech writer. Docs are a feature."],
  ["ravi_k", "Ravi Kumar", "Security engineer. Please rotate your keys."],
  ["emma_pm", "Emma Fischer", "Product manager who still writes SQL."],
  ["jules_art", "Jules Moreau", "Creative coder · generative art"],
  ["kofi_dev", "Kofi Mensah", "Open-source maintainer. Be kind in issues."],
  ["hana_data", "Hana Lee", "Data analyst. Charts or it didn't happen."],
] as const;

const posts = [
  "Just shipped a new feature using #NextJS server actions. No API layer needed for simple mutations 🚀",
  "Hot take: most apps don't need microservices. A well-structured monolith goes a long way. #architecture",
  "Spent the morning optimising a slow query. Adding the right composite index took it from 2s to 4ms. #postgres",
  "TIL you can use keyset pagination instead of OFFSET for infinite scroll. Way faster on large tables. #webdev",
  "Accessibility isn't a feature, it's a baseline. Test your UI with a keyboard today. #a11y #design",
  "Redis as a cache is great, but make sure your app still works when it's down. #reliability",
  "Reading the React docs again and learning something new every time. #react",
  "Coffee count today: 3. Bugs fixed: 1. Bugs introduced: 2. Productive day? ☕ #devlife",
  "Writing tests first for this refactor and it's already paying off. #testing",
  "Code review tip: comment on the code, not the person. Ask questions instead of giving orders.",
  "Dark mode shipped! Took longer than expected because of all the hard-coded colours. #design",
  "Postgres recursive CTEs are underrated. Perfect for threaded comments. #postgres #sql",
  "Monitoring dashboards are only useful if someone looks at them. Alerts > dashboards. #sre",
  "TypeScript strict mode caught three bugs before they hit production this week. #typescript",
  "The best documentation is the one that answers the question you actually have. #docs",
  "Rotating API keys is boring until the day it saves you. #security",
  "Trying out Tailwind v4 and the new CSS-first config is really nice. #tailwindcss #webdev",
  "Shipped on a Friday. Everything is fine. Probably. #devlife",
  "Generative art experiment: 10,000 circles, one rule. Simple systems, complex results. #creativecoding",
  "Data tip: always look at the distribution, not just the average. #data",
  "Open source maintainers are heroes. Say thanks to one today. #opensource",
  "Mobile performance matters: measure on a real low-end device, not your laptop. #mobile",
  "Learning Rust on weekends. The borrow checker and I are slowly becoming friends. #rust",
  "Product question of the day: what problem are we actually solving? #product",
  "Server Components finally clicked for me. Fetch where you render, ship less JavaScript. #react #nextjs",
  "Spent an hour debugging a timezone issue. It's always timezones. #devlife",
  "New blog post on idempotent payment webhooks is up! https://example.com/blog/idempotency",
  "Pair programming session today was the most productive hour of my week.",
  "If your loading spinner shows for 100ms, it's probably making things feel slower. #ux",
  "Feature flags let you merge early and release later. Big fan. #devops",
];

const replies = [
  "This is so true!",
  "Great point, thanks for sharing.",
  "I had the exact same experience last week 😅",
  "Do you have a link with more details?",
  "100% agree with this.",
  "Interesting, I've seen the opposite in my team.",
  "Saving this for later.",
  "Couldn't have said it better.",
  "How long did it take you to migrate?",
  "This made my day 😄",
  "Any tips for getting started?",
  "Bookmarked. Thanks!",
];

async function main() {
  console.log("Clearing existing data…");
  await db.execute(
    sql`truncate table notifications, post_tags, likes, follows, posts, sessions, users restart identity cascade`,
  );

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const now = Date.now();

  console.log("Creating users…");
  const users = await db
    .insert(schema.users)
    .values(
      people.map(([username, name, bio], index) => ({
        username,
        name,
        bio,
        email: `${username.replace("_", ".")}@threadly.dev`,
        passwordHash,
        location: pick([
          "Berlin",
          "Lagos",
          "Toronto",
          "Bangalore",
          "Lisbon",
          "Tokyo",
          "Austin",
          "",
        ]),
        createdAt: new Date(now - (400 - index * 7) * 24 * 60 * MINUTE),
      })),
    )
    .returning();

  console.log("Creating follow graph…");
  const followRows = users.flatMap((follower) =>
    sample(
      users.filter((user) => user.id !== follower.id),
      3 + Math.floor(random() * 10),
    ).map((following) => ({ followerId: follower.id, followingId: following.id })),
  );
  await db.insert(schema.follows).values(followRows);

  console.log("Creating posts…");
  const topLevel = await db
    .insert(schema.posts)
    .values(
      Array.from({ length: 160 }, (_, index) => {
        let content = pick(posts);
        if (random() < 0.2) content = `@${pick(users).username} ${content}`.slice(0, 280);
        return {
          authorId: pick(users).id,
          content,
          createdAt: new Date(now - (index * 37 + Math.floor(random() * 30)) * MINUTE),
        };
      }),
    )
    .returning();

  const replyRows = await db
    .insert(schema.posts)
    .values(
      Array.from({ length: 140 }, () => {
        const parent = pick(topLevel.slice(0, 80));
        return {
          authorId: pick(users).id,
          content: pick(replies),
          parentId: parent.id,
          createdAt: new Date(
            Math.min(
              now - MINUTE,
              parent.createdAt.getTime() + Math.floor(random() * 300) * MINUTE,
            ),
          ),
        };
      }),
    )
    .returning();

  // A few second-level replies so threads have depth.
  await db.insert(schema.posts).values(
    sample(replyRows, 30).map((parent) => ({
      authorId: pick(users).id,
      content: pick(replies),
      parentId: parent.id,
      createdAt: new Date(Math.min(now, parent.createdAt.getTime() + 20 * MINUTE)),
    })),
  );

  const tagRows = topLevel.flatMap((post) =>
    extractHashtags(post.content).map((tag) => ({
      postId: post.id,
      tag,
      createdAt: post.createdAt,
    })),
  );
  if (tagRows.length) await db.insert(schema.postTags).values(tagRows);

  console.log("Creating likes…");
  const likeRows = topLevel.flatMap((post) =>
    sample(users, Math.floor(random() * 12)).map((user) => ({ userId: user.id, postId: post.id })),
  );
  await db.insert(schema.likes).values(likeRows);

  console.log("Recomputing counters…");
  await db.execute(sql`
    update posts p set
      like_count  = (select count(*) from likes l where l.post_id = p.id),
      reply_count = (select count(*) from posts r where r.parent_id = p.id)
  `);
  await db.execute(sql`
    update users u set
      followers_count = (select count(*) from follows f where f.following_id = u.id),
      following_count = (select count(*) from follows f where f.follower_id = u.id),
      posts_count     = (select count(*) from posts p where p.author_id = u.id)
  `);

  console.log("Deriving notifications…");
  // Notifications mirror the seeded activity: likes, replies and follows.
  await db.execute(sql`
    insert into notifications (recipient_id, actor_id, type, post_id, created_at, read_at)
    select p.author_id, l.user_id, 'like', p.id, p.created_at + interval '5 minutes',
           case when random() < 0.6 then now() end
    from likes l join posts p on p.id = l.post_id
    where l.user_id <> p.author_id
  `);
  await db.execute(sql`
    insert into notifications (recipient_id, actor_id, type, post_id, created_at, read_at)
    select parent.author_id, r.author_id, 'reply', r.id, r.created_at,
           case when random() < 0.6 then now() end
    from posts r join posts parent on parent.id = r.parent_id
    where r.author_id <> parent.author_id
  `);
  await db.execute(sql`
    insert into notifications (recipient_id, actor_id, type, created_at, read_at)
    select f.following_id, f.follower_id, 'follow', now() - random() * interval '3 days',
           case when random() < 0.6 then now() end
    from follows f
  `);

  console.log(
    "\nSeed complete. Log in as @demo (or any seeded user) with password %s",
    DEMO_PASSWORD,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end());
