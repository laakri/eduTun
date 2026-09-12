"use client";

import {
	useEffect,
	useRef,
	useState,
	type ChangeEvent,
	type FormEvent,
} from "react";
import { Camera, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast-provider";

type Profile = {
	id: string;
	email: string;
	fullName: string;
	phone: string | null;
	avatarUrl: string | null;
	createdAt: string;
	roles: string[];
	bio: string | null;
	specialties: string | null;
	websiteUrl: string | null;
};

function initials(name: string) {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

export default function SettingsProfilePage() {
	const toast = useToast();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [profile, setProfile] = useState<Profile | null>(null);
	const [fullName, setFullName] = useState("");
	const [phone, setPhone] = useState("");
	const [bio, setBio] = useState("");
	const [specialties, setSpecialties] = useState("");
	const [websiteUrl, setWebsiteUrl] = useState("");

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(false);

	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");

	useEffect(() => {
		let cancelled = false;

		async function loadProfile() {
			try {
				const response = await fetch("/api/profile", {
					credentials: "include",
				});

				if (!response.ok) {
					throw new Error("We couldn't load your profile.");
				}

				const json = await response.json();
				const data: Profile = json.data ?? json;

				if (!cancelled) {
					setProfile(data);
					setFullName(data.fullName);
					setPhone(data.phone ?? "");
					setBio(data.bio ?? "");
					setSpecialties(data.specialties ?? "");
					setWebsiteUrl(data.websiteUrl ?? "");
				}
			} catch (reason) {
				if (!cancelled) {
					setError(
						reason instanceof Error
							? reason.message
							: "We couldn't load your profile.",
					);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		void loadProfile();

		return () => {
			cancelled = true;
		};
	}, []);

	async function saveProfile(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		setError("");
		setNotice("");

		if (fullName.trim().length < 2) {
			setError("Full name must be at least 2 characters.");
			return;
		}

		setSaving(true);

		try {
			const response = await fetch("/api/profile", {
				method: "PATCH",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					fullName: fullName.trim(),
					phone: phone.trim() || null,
					bio: bio.trim() || null,
					specialties: specialties.trim() || null,
					websiteUrl: websiteUrl.trim() || null,
				}),
			});

			const json = await response.json();

			if (!response.ok) {
				throw new Error(
					json.error?.message ?? "Couldn't save your changes.",
				);
			}

			const updated = json.data ?? json;

			setProfile((current) =>
				current ? { ...current, ...updated } : current,
			);

			setNotice("Changes saved.");
			toast("Profile settings saved");
		} catch (reason) {
			setError(
				reason instanceof Error
					? reason.message
					: "Couldn't save your changes.",
			);
		} finally {
			setSaving(false);
		}
	}

	function resetForm() {
		if (!profile) return;

		setFullName(profile.fullName);
		setPhone(profile.phone ?? "");
		setBio(profile.bio ?? "");
		setSpecialties(profile.specialties ?? "");
		setWebsiteUrl(profile.websiteUrl ?? "");
		setError("");
		setNotice("");
	}

	async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];

		if (!file) return;

		setError("");
		setNotice("");

		if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
			setError("Upload a JPEG, PNG, or WebP image.");
			return;
		}

		if (file.size > 4 * 1024 * 1024) {
			setError("Profile image must be 4 MB or smaller.");
			return;
		}

		const formData = new FormData();
		formData.append("avatar", file);

		setUploading(true);

		try {
			const response = await fetch("/api/profile", {
				method: "PATCH",
				credentials: "include",
				body: formData,
			});

			const json = await response.json();

			if (!response.ok) {
				throw new Error(
					json.error?.message ?? "Couldn't update your photo.",
				);
			}

			const updated = json.data ?? json;

			setProfile((current) =>
				current ? { ...current, ...updated } : current,
			);

			setNotice("Profile photo updated.");
		} catch (reason) {
			setError(
				reason instanceof Error
					? reason.message
					: "Couldn't update your photo.",
			);
		} finally {
			setUploading(false);

			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	}

	if (loading) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<Loader2 className="size-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-destructive">
				{error || "Profile not found."}
			</div>
		);
	}

	return (
		<main className="w-full px-4 py-8 sm:px-6">
			<div className="mx-auto max-w-xl">
				<h1 className="text-2xl font-semibold tracking-tight">
					Profile settings
				</h1>

				<div className="mt-8">
					<div className="mb-8 flex items-center gap-4">
						<div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-primary/10 text-center text-2xl font-semibold leading-[5rem] text-primary">
							{profile.avatarUrl ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={profile.avatarUrl}
									alt={profile.fullName}
									className="size-full object-cover"
								/>
							) : (
								initials(profile.fullName)
							)}

							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								disabled={uploading}
								aria-label="Change profile photo"
								className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-80 disabled:opacity-60"
							>
								{uploading ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<Camera className="size-3.5" />
								)}
							</button>
						</div>

						<div>
							<p className="font-medium">{profile.fullName}</p>
							<p className="text-sm text-muted-foreground">
								Profile photo
							</p>
						</div>
					</div>

					<input
						ref={fileInputRef}
						type="file"
						accept="image/jpeg,image/png,image/webp"
						className="hidden"
						onChange={uploadAvatar}
					/>

					<form onSubmit={saveProfile} className="space-y-5">
						<div className="space-y-2">
							<Label htmlFor="fullName">Full name</Label>
							<Input
								id="fullName"
								value={fullName}
								onChange={(event) =>
									setFullName(event.target.value)
								}
								minLength={2}
								maxLength={120}
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">Email address</Label>
							<Input
								id="email"
								value={profile.email}
								readOnly
								className="bg-muted/50"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="phone">Phone number</Label>
							<Input
								id="phone"
								value={phone}
								onChange={(event) =>
									setPhone(event.target.value)
								}
								maxLength={30}
								placeholder="Optional"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="bio">Teaching bio</Label>
							<textarea id="bio" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={1200} rows={4} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Tell students what you teach and how you help them learn." />
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2"><Label htmlFor="specialties">Specialties</Label><Input id="specialties" value={specialties} onChange={(event) => setSpecialties(event.target.value)} maxLength={300} placeholder="Algebra, calculus, exam preparation" /></div>
							<div className="space-y-2"><Label htmlFor="websiteUrl">Website</Label><Input id="websiteUrl" type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} maxLength={300} placeholder="https://..." /></div>
						</div>

						{error && (
							<p className="text-sm text-destructive" role="alert">
								{error}
							</p>
						)}

						{notice && (
							<p className="flex items-center gap-2 text-sm text-primary">
								<Check className="size-4" />
								{notice}
							</p>
						)}

						<div className="flex justify-end gap-2 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={resetForm}
								disabled={saving}
							>
								Discard
							</Button>

							<Button type="submit" disabled={saving}>
								{saving && (
									<Loader2 className="size-4 animate-spin" />
								)}
								Save changes
							</Button>
						</div>
					</form>
				</div>
			</div>
		</main>
	);
}
