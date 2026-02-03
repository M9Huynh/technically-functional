import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  TextInput,
} from "react-native";
import { UserData, getCurrentUser } from "../../lib/temp";
import {
  getComments,
  getUserActivities,
  CommentData,
  postComment,
  getName,
} from "../../lib/profileActivity";

export default function Feedback() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const currentUser = await getCurrentUser();
      setUserData(currentUser);
      if (currentUser) {
        const acts = await getUserActivities(currentUser.uid);
        setActivities(acts);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Physio{"\n"}Companion</Text>

      {activities.map((activity, index) => (
        <Pressable
          key={index}
          style={styles.card}
          onPress={() => {
            setSelectedActivity(activity);
            setVisible(true);
          }}
        >
          <Text style={styles.title}>{activity.exercise}</Text>
          <Text style={styles.leftText}>
            Completed On:{" "}
            {new Date(activity.date_performed + "T12:00:00").toLocaleDateString()}
          </Text>
          <Text style={styles.leftText}>
            Reps: {activity.completed_reps || 0}
          </Text>
        </Pressable>
      ))}

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ActivityModalContent
              activity={selectedActivity}
              userId={userData?.uid ?? ""}
              onClose={() => {
                setVisible(false);
                setSelectedActivity(null);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}


function ActivityModalContent({
  activity,
  userId,
  onClose,
}: {
  activity: any | null;
  userId: string;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState("");
  useEffect(() => {
    if (!activity) return;
    setComments([]);
    getComments(activity.actid).then(setComments);
  }, [activity?.actid]);

  if (!activity) return null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.title}>{activity.exercise}</Text>
        <Pressable onPress={onClose}>
          <Text>✕</Text>
        </Pressable>
      </View>

      <FlatList
        data={comments}
        keyExtractor={(item) => item.cid}
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Text style={styles.commentAuthor}>{item.author}</Text>
            <Text>{item.comment}</Text>
          </View>
        )}
      />

      <View style={styles.inputBar}>
        <TextInput
          value={newComment}
          onChangeText={setNewComment}
          placeholder="Add a comment..."
          style={styles.input}
        />
        <Pressable
          onPress={async () => {
            if (!newComment.trim()) return;
            await postComment(activity.actid, userId, newComment);
            setNewComment("");
            setComments(await getComments(activity.actid));
          }}
        >
          <Text>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 18, paddingTop: 60 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logo: { fontSize: 34, fontWeight: "800" },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10,
    justifyContent: "center",
    textAlign: "center",
  },
  chart: { borderRadius: 20, marginBottom: 20, overflow: "hidden" },
  text: { color: "#666", fontSize: 16, marginBottom: 10, textAlign: "center" },
  leftText: {
    textAlign: "left",
    color: "#666",
    fontSize: 16,
    marginBottom: 10,
  },
  rightText: {
    textAlign: "right",
    color: "#666",
    fontSize: 16,
    marginBottom: 10,
  },
  card: {
    borderRadius: 14,
    backgroundColor: "#f4f4f4",
    padding: 5,
    marginBottom: 15,
  },
    overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },
  modal: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    height: "85%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  close: {
    fontSize: 18,
  },
  activityInfo: {
    padding: 16,
    borderBottomWidth: 1,
  },
  comment: {
    padding: 12,
    borderBottomWidth: 1,
  },
  commentAuthor: {
    fontWeight: "600",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  send: {
    padding: 8,
  },
});
