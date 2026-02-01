import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function HeroSection() {
    return (
        <>
            <main className="[--color-primary:var(--color-indigo-500)]">
                <section className="overflow-hidden">
                    <div className="py-20 md:py-36">
                        <div className="relative z-10 mx-auto max-w-5xl px-6">
                            <div className="relative text-center">
                                <h1 className="mx-auto max-w-2xl text-balance text-4xl font-bold md:text-5xl">Real-Time Disaster Response When Every Second Counts</h1>

                                <p className="text-muted-foreground mx-auto my-6 max-w-2xl text-balance text-xl">AI-powered coordination for first responders, hospitals, and civilians during emergencies.</p>

                                <p className="text-muted-foreground mb-6 text-sm">I am a...</p>
                                <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                                    <Link
                                        href="/dashboard/firstresponders"
                                        className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border bg-card p-6 text-center shadow-sm transition-all hover:shadow-md hover:border-red-500/50 hover:bg-red-500/5"
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 group-hover:bg-red-500/20">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                        </div>
                                        <div>
                                            <div className="font-semibold">First Responder</div>
                                            <div className="text-muted-foreground text-xs">Fire, Police, Rescue</div>
                                        </div>
                                    </Link>
                                    <Link
                                        href="/dashboard"
                                        className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border bg-card p-6 text-center shadow-sm transition-all hover:shadow-md hover:border-blue-500/50 hover:bg-blue-500/5"
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 group-hover:bg-blue-500/20">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/></svg>
                                        </div>
                                        <div>
                                            <div className="font-semibold">Dispatcher</div>
                                            <div className="text-muted-foreground text-xs">Coordinate Response</div>
                                        </div>
                                    </Link>
                                    <Link
                                        href="/emergency"
                                        className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border bg-card p-6 text-center shadow-sm transition-all hover:shadow-md hover:border-orange-500/50 hover:bg-orange-500/5"
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10 text-orange-600 group-hover:bg-orange-500/20">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                        </div>
                                        <div>
                                            <div className="font-semibold">Civilian</div>
                                            <div className="text-muted-foreground text-xs">Report Emergency</div>
                                        </div>
                                    </Link>
                                    <Link
                                        href="/dashboard/hospitals"
                                        className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border bg-card p-6 text-center shadow-sm transition-all hover:shadow-md hover:border-emerald-500/50 hover:bg-emerald-500/5"
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/></svg>
                                        </div>
                                        <div>
                                            <div className="font-semibold">Hospital</div>
                                            <div className="text-muted-foreground text-xs">Manage Capacity</div>
                                        </div>
                                    </Link>
                                </div>
                            </div>

                            <div className="relative mx-auto mt-12 max-w-5xl overflow-hidden rounded-3xl bg-black/10 md:mt-20">
                                <img
                                    src="https://images.unsplash.com/photo-1637055972140-64608c1abe53?q=80&w=2942&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                                    alt=""
                                    className="absolute inset-0 size-full object-cover"
                                />

                                <div className="bg-background rounded-(--radius) relative m-4 overflow-hidden border border-transparent shadow-xl shadow-black/15 ring-1 ring-black/10 sm:m-8 md:m-12">
                                    <Image
                                        src="/screenshot.png"
                                        alt="app screen"
                                        width="2880"
                                        height="1842"
                                        className="object-top-left size-full object-cover"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}
