"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { getUserSavedSearches } from "./actions";
import type { SavedSearchDTO } from "@/lib/dto/SavedSearchDTO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui";

import SearchStats from "./components/SearchStats";
import SavedSearchCard from "./components/SavedSearchCard";
import { buildSavedSearchUrl } from "@/lib/savedSearches";
import CreateSearchDialog from "./components/CreateSearchDialog";
import RenameSearchDialog from "./components/RenameSearchDialog";
import DeleteSearchDialog from "./components/DeleteSearchDialog";
import Loading from "./loading";

export default function SavedSearchesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [searches, setSearches] = useState<SavedSearchDTO[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function loadSearches() {
    if (!user) {
      setSearches([]);
      setPageLoading(false);
      return;
    }

    setPageLoading(true);

    try {
      const result = await getUserSavedSearches(user.id);
      setSearches(result);
    } catch {
      setSearches([]);
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }

    void loadSearches();
  }, [user, loading, router]);

  useEffect(() => {
    const handleUpdate = () => {
      void loadSearches();
    };

    window.addEventListener("savedSearchUpdated", handleUpdate);

    return () => window.removeEventListener("savedSearchUpdated", handleUpdate);
  }, [user]);

  const stats = useMemo(() => {
    const active = searches.filter((item) => item.active).length;

    return {
      total: searches.length,
      active,
      paused: searches.length - active,
      thisWeek: searches.filter((search) => {
        const created = new Date(search.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created >= weekAgo;
      }).length,
    };
  }, [searches]);

  function handleRename(id: string) {
    const search = searches.find((item) => item.id === id);

    if (!search) {
      return;
    }

    setRenameTarget({
      id: search.id,
      name: search.name,
    });
  }

  function handleDelete(id: string) {
    const search = searches.find((item) => item.id === id);

    if (!search) {
      return;
    }

    setDeleteTarget({
      id: search.id,
      name: search.name,
    });
  }

  function handleOpen(id: string) {
    const search = searches.find((item) => item.id === id);

    if (!search) {
      return;
    }

    router.push(buildSavedSearchUrl(search.filters));
  }

  if (loading || pageLoading) {
    return <Loading />;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 pt-24">
        <PageHeader
          title="Saved Searches"
          description="Manage your saved property searches and receive automatic alerts."
          action={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              + New Search
            </Button>
          }
        />

        <SearchStats
          total={stats.total}
          active={stats.active}
          paused={stats.paused}
          thisWeek={stats.thisWeek}
        />

        <div className="mt-10">
          {searches.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No Saved Searches"
              description="Save your favourite searches to receive instant alerts."
              action={
                <Button type="button" onClick={() => setCreateOpen(true)}>
                  Create Search
                </Button>
              }
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {searches.map((search) => (
                <SavedSearchCard
                  key={search.id}
                  search={search}
                  onOpen={handleOpen}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onToggled={loadSearches}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {renameTarget ? (
        <RenameSearchDialog
          id={renameTarget.id}
          currentName={renameTarget.name}
          open={Boolean(renameTarget)}
          onClose={() => setRenameTarget(null)}
          onRenamed={loadSearches}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteSearchDialog
          id={deleteTarget.id}
          name={deleteTarget.name}
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onDeleted={loadSearches}
        />
      ) : null}

      <CreateSearchDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        filters={{}}
        onSaved={loadSearches}
      />
    </>
  );
}
