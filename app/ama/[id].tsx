import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLifelist } from '../../lib/lifelist-store';
import { askAma } from '../../lib/ama-service';
import { useAmaThread } from '../../lib/ama-store';
import { colors, radii, spacing } from '../../lib/theme';

export default function AmaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getEntry } = useLifelist();
  const entry = getEntry(id);

  const { messages, append } = useAmaThread(id);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  if (!entry) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Species not found.</Text>
      </SafeAreaView>
    );
  }

  async function handleSend() {
    const question = draft.trim();
    if (!question || sending) return;
    if (!entry) return;

    const history = messages;
    setDraft('');
    setSending(true);
    try {
      await append('user', question);
      const answer = await askAma(entry, question, history);
      await append('assistant', answer);
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Ask about {entry.commonName}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messages}
        ListEmptyComponent={
          <Text style={styles.hint}>Ask an identification question or a fact about the {entry.commonName}.</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
            <Text style={item.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant}>{item.text}</Text>
          </View>
        )}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask a question…"
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <Pressable style={styles.sendButton} onPress={handleSend} disabled={sending}>
            <Text style={styles.sendLabel}>{sending ? '…' : 'Send'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  notFound: { padding: spacing.lg, color: colors.inkMuted },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  close: { color: colors.forest, fontWeight: '600' },
  messages: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  hint: { color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xl },
  bubble: { maxWidth: '85%', borderRadius: radii.md, padding: spacing.sm },
  bubbleUser: { backgroundColor: colors.forest, alignSelf: 'flex-end' },
  bubbleAssistant: { backgroundColor: colors.surface, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
  bubbleTextUser: { color: colors.surface },
  bubbleTextAssistant: { color: colors.ink },
  inputRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
  },
  sendButton: {
    backgroundColor: colors.forest,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendLabel: { color: colors.surface, fontWeight: '700' },
});
