"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Stats {
  totalResources: number;
  totalCategories: number;
  totalSubcategories: number;
  totalUsers: number;
  pendingSubmissions: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    // Check admin status
    fetch("/api/auth/admin-status")
      .then(res => res.json())
      .then(data => {
        setIsAdmin(data.isAdmin);
        if (!data.isAdmin) {
          router.push("/login");
        }
      })
      .catch(() => {
        setIsAdmin(false);
        router.push("/login");
      });
  }, [router]);

  useEffect(() => {
    if (isAdmin) {
      // Fetch stats
      fetch("/api/admin/stats")
        .then(res => res.json())
        .then(data => {
          setStats(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch stats:", err);
          setLoading(false);
        });

      // Fetch categories
      fetch("/api/admin/categories")
        .then(res => res.json())
        .then(data => setCategories(Array.isArray(data) ? data : []))
        .catch(err => console.error("Failed to fetch categories:", err));
    }
  }, [isAdmin]);

  if (isAdmin === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You do not have admin privileges.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "categories", label: "Categories" },
    { id: "resources", label: "Resources" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage your awesome list</p>
            </div>
            <div className="flex items-center gap-4">
              <a href="/" className="text-sm text-muted-foreground hover:text-primary">
                Back to site
              </a>
              <button
                onClick={() => {
                  fetch("/api/auth/logout", { method: "POST" })
                    .then(() => router.push("/login"));
                }}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:opacity-90 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b bg-card/30">
        <div className="container mx-auto px-4">
          <nav className="flex gap-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-6 bg-card border rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground">Total Resources</h3>
                <p className="text-3xl font-bold text-primary mt-2">{stats?.totalResources || 0}</p>
              </div>
              <div className="p-6 bg-card border rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground">Categories</h3>
                <p className="text-3xl font-bold text-primary mt-2">{stats?.totalCategories || 0}</p>
              </div>
              <div className="p-6 bg-card border rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground">Subcategories</h3>
                <p className="text-3xl font-bold text-primary mt-2">{stats?.totalSubcategories || 0}</p>
              </div>
              <div className="p-6 bg-card border rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground">Users</h3>
                <p className="text-3xl font-bold text-primary mt-2">{stats?.totalUsers || 0}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-6 bg-card border rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveTab("categories")}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
                >
                  Manage Categories
                </button>
                <button
                  onClick={() => setActiveTab("resources")}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:opacity-90"
                >
                  Manage Resources
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "categories" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Categories</h2>
            </div>
            
            <div className="bg-card border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Slug</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id} className="border-t">
                      <td className="px-4 py-3 text-sm">{cat.id}</td>
                      <td className="px-4 py-3 text-sm font-medium">{cat.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{cat.slug}</td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        No categories found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "resources" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Resources</h2>
            <p className="text-muted-foreground">
              Resource management coming soon. Use the API endpoints directly for now.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
