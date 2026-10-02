import Link from "next/link";
import { redirect } from "next/navigation";
import { AtSign, Bell, Hash, Heart, MessageCircle, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

const features = [
  {
    icon: MessageCircle,
    title: "Threaded conversations",
    text: "Reply to posts and follow discussions as they unfold.",
  },
  {
    icon: Heart,
    title: "Instant reactions",
    text: "Likes update optimistically, without waiting for the server.",
  },
  {
    icon: Bell,
    title: "Real-time notifications",
    text: "Know the moment someone follows, likes, replies or mentions you.",
  },
  {
    icon: Users,
    title: "Follow people",
    text: "Build a personal timeline from the people you care about.",
  },
  { icon: Hash, title: "Hashtags", text: "Discover trending topics and browse posts by tag." },
  { icon: AtSign, title: "Mentions", text: "Bring others into the conversation with @mentions." },
];

export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/home");

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <AtSign className="size-5" aria-hidden />
          </span>
          Threadly
        </Link>
        <nav className="flex gap-2">
          <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
            Log in
          </Link>
          <Link href="/register" className={buttonVariants()}>
            Sign up
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="py-20 text-center sm:py-28">
          <h1 className="mx-auto max-w-3xl text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            What&apos;s happening? <span className="text-brand-600">Join the conversation.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600">
            Share short posts, follow interesting people and get notified in real time when your
            community responds.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              Create your account
            </Link>
            <Link href="/explore" className={buttonVariants({ size: "lg", variant: "outline" })}>
              Explore posts
            </Link>
          </div>
        </section>

        <section className="grid gap-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <Icon className="size-6 text-brand-600" aria-hidden />
              <h2 className="mt-4 font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
