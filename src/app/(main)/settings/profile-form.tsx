"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateProfile } from "@/app/(main)/user-actions";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";

type ProfileDefaults = { name: string; bio: string; location: string; website: string };

export function ProfileForm({ defaults }: { defaults: ProfileDefaults }) {
  const [state, formAction, pending] = useActionState(updateProfile, null);

  useEffect(() => {
    if (state?.success && state.message) toast.success(state.message);
  }, [state]);

  const value = (field: keyof ProfileDefaults) => state?.fields?.[field] ?? defaults[field];

  return (
    <form action={formAction} className="max-w-lg space-y-5" key={JSON.stringify(state?.fields)}>
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" maxLength={50} defaultValue={value("name")} />
        <FieldError messages={state?.errors?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" maxLength={160} rows={3} defaultValue={value("bio")} />
        <FieldError messages={state?.errors?.bio} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" maxLength={50} defaultValue={value("location")} />
        <FieldError messages={state?.errors?.location} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          name="website"
          placeholder="example.com"
          defaultValue={value("website")}
        />
        <FieldError messages={state?.errors?.website} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
