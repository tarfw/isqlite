import { db } from "@/lib/db";
import { AppSchema } from "@/instant.schema";
import { id, InstaQLEntity } from "@instantdb/react-native";
import React, { useMemo, useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, FlatList, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system";

// Types
export type Todo = InstaQLEntity<AppSchema, "todos">;

// Presence room
const room = db.room("todos");

function App() {
  const { isLoading, error, data } = db.useQuery({
    todos: {
      $: { order: { createdAt: "desc" } },
    },
  });
  const { peers } = db.rooms.usePresence(room);
  const numUsers = 1 + Object.keys(peers).length;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Text>Error: {error.message}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white px-4 pt-4">
      <ScrollView className="flex-1">
        <View className="w-full border border-gray-300 rounded-md overflow-hidden">
          <View className="px-3 py-2 bg-gray-100 border-b border-gray-300">
            <Text className="text-3xl">todos</Text>
            <Text className="text-xs text-gray-500">
              Number of users online: {numUsers}
            </Text>
          </View>
          <TodoForm />
          <TodoList />
          <ActionBar />
        </View>
        <Text className="text-xs text-gray-500 mt-2">
          Open another device or tab to see realtime updates!
        </Text>
        <StorageStats />
      </ScrollView>
    </SafeAreaView>
  );
}

// Actions
function addTodo(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  db.transact(
    db.tx.todos[id()].update({
      text: trimmed,
      done: false,
      createdAt: Date.now(),
    })
  );
}

function deleteTodo(todo: Todo) {
  db.transact(db.tx.todos[todo.id].delete());
}

function toggleDone(todo: Todo) {
  db.transact(db.tx.todos[todo.id].update({ done: !todo.done }));
}

function deleteCompleted(todos: Todo[]) {
  const completed = todos.filter((t) => t.done);
  if (!completed.length) return;
  db.transact(completed.map((t) => db.tx.todos[t.id].delete()));
}

function toggleAll(todos: Todo[]) {
  const newVal = !todos.every((t) => t.done);
  db.transact(todos.map((t) => db.tx.todos[t.id].update({ done: newVal })));
}

// Components
function TodoForm() {
  const [text, setText] = useState("");
  return (
    <View className="flex-row items-center border-b border-gray-300">
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          // Toggle all via current list
          const { data } = db.queryNow({ todos: {} });
          toggleAll(data.todos as Todo[]);
        }}
        className="h-10 px-3 justify-center border-r border-gray-300"
      >
        <Text>⌄</Text>
      </Pressable>
      <View className="flex-1 h-10">
        <TextInput
          className="px-3 h-full"
          placeholder="What needs to be done?"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => {
            addTodo(text);
            setText("");
          }}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

function TodoList() {
  const { data } = db.useQuery({ todos: {} });
  const todos = (data?.todos ?? []) as Todo[];
  return (
    <FlatList
      data={todos}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => (
        <View className="h-px bg-gray-300" />
      )}
      renderItem={({ item }) => (
        <View className="flex-row items-center h-12 px-2">
          <Pressable
            accessibilityRole="checkbox"
            onPress={() => toggleDone(item)}
            className="w-10 items-center justify-center"
          >
            <Text>{item.done ? "☑" : "☐"}</Text>
          </Pressable>
          <View className="flex-1 px-2">
            <Text className={item.done ? "line-through" : undefined}>
              {item.text}
            </Text>
          </View>
          <Pressable onPress={() => deleteTodo(item)} className="w-10 items-center">
            <Text className="text-gray-400">X</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

function ActionBar() {
  const { data } = db.useQuery({ todos: {} });
  const todos = (data?.todos ?? []) as Todo[];
  const remaining = useMemo(() => todos.filter((t) => !t.done).length, [todos]);
  return (
    <View className="h-10 px-3 flex-row items-center justify-between border-t border-gray-300">
      <Text className="text-xs">Remaining todos: {remaining}</Text>
      <Pressable onPress={() => deleteCompleted(todos)}>
        <Text className="text-xs text-gray-500">Delete Completed</Text>
      </Pressable>
    </View>
  );
}

function StorageStats() {
  const [stats, setStats] = useState<{
    dbSize: string;
    numKeys: number;
    totalTodos: number;
    estimatedSize: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const { data } = db.useQuery({ todos: {} });
  const todos = (data?.todos ?? []) as Todo[];

  const loadStats = async () => {
    setLoading(true);
    try {
      // Get database file size
      const dbPath = `${FileSystem.documentDirectory}SQLite/instant_kv.db`;
      let dbSize = "0 KB";
      try {
        const fileInfo = await FileSystem.getInfoAsync(dbPath);
        if (fileInfo.exists && 'size' in fileInfo) {
          const sizeInKB = (fileInfo.size / 1024).toFixed(2);
          const sizeInMB = (fileInfo.size / (1024 * 1024)).toFixed(2);
          dbSize = fileInfo.size > 1024 * 1024 
            ? `${sizeInMB} MB` 
            : `${sizeInKB} KB`;
        }
      } catch (e) {
        dbSize = "Unable to read";
      }

      // Estimate data size
      const todosJson = JSON.stringify(todos);
      const estimatedBytes = new Blob([todosJson]).size;
      const estimatedKB = (estimatedBytes / 1024).toFixed(2);
      const estimatedMB = (estimatedBytes / (1024 * 1024)).toFixed(2);
      const estimatedSize = estimatedBytes > 1024 * 1024
        ? `${estimatedMB} MB`
        : `${estimatedKB} KB`;

      setStats({
        dbSize,
        numKeys: 0, // We can't easily get this without exposing it from sqliteStorage
        totalTodos: todos.length,
        estimatedSize,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [todos.length]);

  if (!stats) return null;

  return (
    <View className="mt-4 mb-4 p-3 border border-gray-300 rounded-md bg-gray-50">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-semibold">Storage Statistics</Text>
        <Pressable 
          onPress={loadStats} 
          disabled={loading}
          className="px-2 py-1 bg-blue-500 rounded"
        >
          <Text className="text-xs text-white">{loading ? "..." : "Refresh"}</Text>
        </Pressable>
      </View>
      
      <View className="space-y-1">
        <View className="flex-row justify-between py-1">
          <Text className="text-xs text-gray-600">SQLite DB Size:</Text>
          <Text className="text-xs font-mono">{stats.dbSize}</Text>
        </View>
        
        <View className="flex-row justify-between py-1">
          <Text className="text-xs text-gray-600">Total Todos:</Text>
          <Text className="text-xs font-mono">{stats.totalTodos}</Text>
        </View>
        
        <View className="flex-row justify-between py-1">
          <Text className="text-xs text-gray-600">Estimated Todo Data:</Text>
          <Text className="text-xs font-mono">{stats.estimatedSize}</Text>
        </View>
        
        <View className="flex-row justify-between py-1">
          <Text className="text-xs text-gray-600">Avg per Todo:</Text>
          <Text className="text-xs font-mono">
            {stats.totalTodos > 0 
              ? `${(JSON.stringify(todos).length / stats.totalTodos).toFixed(0)} bytes`
              : "N/A"}
          </Text>
        </View>
      </View>
      
      <Text className="text-[10px] text-gray-400 mt-2">
        Note: SQLite DB includes sync metadata and overhead. Actual todo data is smaller.
      </Text>
    </View>
  );
}

export default App;
