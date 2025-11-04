import { db } from "@/lib/db";
import { AppSchema } from "@/instant.schema";
import { id, InstaQLEntity } from "@instantdb/react-native";
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

export default App;
