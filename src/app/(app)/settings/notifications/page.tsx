"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type NotificationItem = {
	id: string;
	type: string;
	title: string;
	description: string;
	createdAt: string;
};

export default function NotificationsSettingsPage() {
	const [settings, setSettings] = useState({
		email: true,
		courseUpdates: true,
		newCourses: false,
		announcements: true,
	});
	const [saved, setSaved] = useState(false);
	const [notifications, setNotifications] = useState<NotificationItem[]>([]);
	const [loadingNotifications, setLoadingNotifications] = useState(true);
	const [notificationsError, setNotificationsError] = useState<string | null>(null);

	useEffect(() => {
		async function loadNotifications() {
			try {
				const response = await fetch("/api/notifications/professor");
				const json = await response.json();
				if (!response.ok) {
					throw new Error(json.error?.message ?? "Could not load notifications.");
				}
				setNotifications(json.data ?? []);
				setNotificationsError(null);
			} catch (error) {
				setNotificationsError(
					error instanceof Error ? error.message : "Could not load notifications.",
				);
				setNotifications([]);
			} finally {
				setLoadingNotifications(false);
			}
		}

		void loadNotifications();
	}, []);

	function toggle(key: keyof typeof settings) {
		setSettings((current) => ({
			...current,
			[key]: !current[key],
		}));
		setSaved(false);
	}

	function saveSettings() {
		setSaved(true);
	}

	return (
		<main className="w-full px-4 py-8 sm:px-6">
			<div className="mx-auto max-w-3xl">
				<h1 className="text-2xl font-semibold tracking-tight">
					Notification settings
				</h1>

				<p className="mt-2 text-sm text-muted-foreground">
					Choose which notifications you want to receive.
				</p>

				<div className="mt-8 space-y-8">
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
							<Bell className="size-5 text-primary" />
						</div>

						<div>
							<p className="font-medium">Notifications</p>
							<p className="text-sm text-muted-foreground">
								Manage your notification preferences.
							</p>
						</div>
					</div>

					<div className="space-y-1">
						<NotificationRow
							title="Email notifications"
							description="Receive important updates by email."
							checked={settings.email}
							onChange={() => toggle("email")}
						/>

						<NotificationRow
							title="Course updates"
							description="Get notified when your courses are updated."
							checked={settings.courseUpdates}
							onChange={() => toggle("courseUpdates")}
						/>

						<NotificationRow
							title="New courses"
							description="Get notified when new courses are published."
							checked={settings.newCourses}
							onChange={() => toggle("newCourses")}
						/>

						<NotificationRow
							title="Announcements"
							description="Receive important platform announcements."
							checked={settings.announcements}
							onChange={() => toggle("announcements")}
						/>
					</div>

					<div className="rounded-xl border border-border bg-muted/20 p-4">
						<div className="mb-3 flex items-center justify-between gap-3">
							<div>
								<h2 className="text-sm font-semibold">Recent activity</h2>
								<p className="text-xs text-muted-foreground">Latest updates from your courses.</p>
							</div>
						</div>

						{loadingNotifications ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="size-4 animate-spin" />
								Loading notifications...
							</div>
						) : notificationsError ? (
							<p className="text-sm text-muted-foreground">{notificationsError}</p>
						) : notifications.length === 0 ? (
							<p className="text-sm text-muted-foreground">No recent notifications yet.</p>
						) : (
							<div className="space-y-3">
								{notifications.map((notification) => (
									<div key={notification.id} className="rounded-lg border border-border bg-background p-3">
										<div className="flex items-center justify-between gap-3">
											<p className="text-sm font-medium">{notification.title}</p>
											<span className="text-[10px] uppercase tracking-[0.12em] text-primary">{notification.type}</span>
										</div>
										<p className="mt-1 text-sm text-muted-foreground">{notification.description}</p>
										<p className="mt-2 text-[11px] text-muted-foreground">
											{new Date(notification.createdAt).toLocaleString([], {
												year: "numeric",
												month: "short",
												day: "numeric",
												hour: "numeric",
												minute: "2-digit",
											})}
										</p>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="flex items-center justify-end gap-3 pt-2">
						{saved && (
							<p className="flex items-center gap-1.5 text-sm text-primary">
								<Check className="size-4" />
								Changes saved.
							</p>
						)}

						<Button onClick={saveSettings}>Save changes</Button>
					</div>
				</div>
			</div>
		</main>
	);
}

type NotificationRowProps = {
	title: string;
	description: string;
	checked: boolean;
	onChange: () => void;
};

function NotificationRow({
	title,
	description,
	checked,
	onChange,
}: NotificationRowProps) {
	return (
		<div className="flex items-center justify-between gap-6 border-b border-border py-5 last:border-b-0">
			<div>
				<p className="text-sm font-medium">{title}</p>
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			</div>

			<button
				type="button"
				role="switch"
				aria-checked={checked}
				onClick={onChange}
				className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
					checked ? "bg-primary" : "bg-muted"
				}`}
			>
				<span
					className={`absolute top-1 size-4 rounded-full bg-white transition-transform ${
						checked ? "left-6" : "left-1"
					}`}
				/>
			</button>
		</div>
	);
}
