import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  type: "document" | "client";
  created_at: string;
}

export function useCategories(type: "document" | "client") {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("type", type)
      .order("name");

    if (!error) setCategories(data as Category[] || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, [type]);

  const addCategory = async (name: string) => {
    const { error } = await supabase
      .from("categories")
      .insert({ name: name.trim(), type });
    if (!error) await fetchCategories();
    return !error;
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);
    if (!error) await fetchCategories();
    return !error;
  };

  return { categories, isLoading, addCategory, deleteCategory, refetch: fetchCategories };
}
