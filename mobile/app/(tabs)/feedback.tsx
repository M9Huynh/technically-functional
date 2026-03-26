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
  ScrollView,
} from "react-native";
import { UserData } from "../../lib/useraccount";
import {
  getComments,
  getUserActivities,
  CommentData,
  postComment,
  getName,
  getCurrentUser,
  getSelectedUserID,
  getCommentCounts,
} from "../../lib/profileActivity";
import { getUserRole, UserRole } from "@/lib/roleStore";
import { useFocusEffect } from "@react-navigation/native";

export default function Feedback() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [role, setRole] = useState<UserRole>("patient");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(
    new Map(),
  );

  useEffect(() => {
    (async () => {
      const r = await getUserRole();
      if (r) setRole(r);

      const currentUser = await getCurrentUser();
      setUserData(currentUser);
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!userData) return;
      (async () => {
        let userActivities: any[] = [];
        if (role === "patient") {
          userActivities = await getUserActivities(userData.uid);
        } else {
          const s = await getSelectedUserID();
          if (s) {
            setSelectedUser(s);
            userActivities = await getUserActivities(s);
          }
        }
        setActivities(userActivities);

        // Fetch comment counts for all activities
        if (userActivities.length > 0) {
          const actids = userActivities.map((activity) => activity.actid);
          const counts = await getCommentCounts(actids);
          setCommentCounts(counts);
        }
      })();
    }, [userData, role]),
  );

  if (role === "physio" && !selectedUser) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.logo}>Physio{"\n"}Companion</Text>
        </View>
        <Text style={styles.text}>
          Please select a patient on the Home page to begin.
        </Text>
      </View>
    );
  } else {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>Physio{"\n"}Companion</Text>
        <Text style={styles.pageSub}>
          Please select an Activity to view more details and leave/view
          feedback.
        </Text>

        {activities.map((activity, index) => (
          <Pressable
            key={index}
            style={[styles.card]}
            onPress={() => {
              setSelectedActivity(activity);
              setVisible(true);
            }}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{activity.exercise}</Text>
              <Text style={styles.commentCount}>
                💬 {commentCounts.get(activity.actid) || 0}
              </Text>
            </View>
            <Text style={styles.centerText}>
              Recorded Activity on{" "}
              {new Date(
                activity.date_performed + "T12:00:00",
              ).toLocaleDateString("en-CA", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
            {/*             <View style={styles.statline}>
              <Text style={styles.normText}>
                Reps: {activity.completed_reps || 0}
              </Text>
              <Text style={styles.normText}>
                Pain: {activity.pain || 0}
              </Text>
              <Text style={styles.normText}>
                Effort: {activity.effort || 0}
              </Text>
              <Text style={styles.normText}>
                Satisfaction: {activity.satisfaction || 0}
              </Text>
            </View> */}
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
      </ScrollView>
    );
  }
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
      <View style={styles.headerBody}>
        <View style={styles.header}>
          <Text style={[styles.title, { textAlign: "left", flex: 1 }]}>
            {activity.exercise}
          </Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.leftText}>
          Recorded Activity on{" "}
          {new Date(activity.date_performed + "T12:00:00").toLocaleDateString(
            "en-CA",
            {
              month: "long",
              day: "numeric",
              year: "numeric",
            },
          )}
        </Text>
        <View style={styles.doubleColumn}>
          <View style={ {justifyContent: "space-between", width: "50%"}}>
            <Text style={styles.leftText}>Reps: {activity.completed_reps}</Text>
            <Text style={styles.leftText}>Duration: {activity.duration}s</Text>
            <Text style={styles.leftText}>Max Angle: {activity.max_height}°</Text>
            <Text style={styles.leftText}>Min Angle: {activity.min_height}°</Text>
          </View>
          <View>
            <Text style={styles.leftText}>Pain: {activity.pain} / 10</Text>
            <Text style={styles.leftText}>Effort: {activity.effort} / 10</Text>
            <Text style={styles.leftText}>Satisfaction: {activity.satisfaction} / 10</Text>
          </View>
        </View>
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
  container: { backgroundColor: "#fff", padding: 18, paddingTop: 60 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logo: { fontSize: 34, fontWeight: "800" },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
    justifyContent: "center",
    textAlign: "center",
    marginLeft: 14,
  },
  pageSub: {
    marginTop: 6,
    color: "#666",
    textAlign: "center",
    marginBottom: 18,
  },
  chart: { borderRadius: 20, marginBottom: 20, overflow: "hidden" },
  text: { color: "#666", fontSize: 16, marginBottom: 10, textAlign: "center" },
  normText: {
    color: "#666",
    fontSize: 16,
    marginBottom: 10,
  },
  leftText: {
    textAlign: "left",
    color: "#666",
    fontSize: 16,
    marginBottom: 10,
    width: "100%",
  },
  centerText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    marginBottom: 10,
    width: "100%",
  },
  rightText: {
    textAlign: "right",
    color: "#666",
    fontSize: 16,
    marginBottom: 10,
  },
  closeBtn: {
    alignSelf: "flex-start",
    padding: 6,
  },
  card: {
    borderRadius: 14,
    backgroundColor: "#dddddd",
    padding: 5,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  commentCount: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
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
    alignItems: "flex-start",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerBody: {
    flexDirection: "column",
    alignItems: "flex-start",
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
  statline: {
    justifyContent: "space-around",
    flexDirection: "row",
    maxWidth: "100%",
  },
  doubleColumn: {
    flexDirection: "row",
  },
});
