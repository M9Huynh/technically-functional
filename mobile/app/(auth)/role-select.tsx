import React from "react";
import { Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import ScreenContainer from "../../components/screenContainer";
import AppLogo from "../../components/appLogo";
import PrimaryButton from "../../components/primaryButton";
import { setUserRole, UserRole } from "../../lib/roleStore";

export default function RoleSelect() {
  const router = useRouter();

  const goToLogin = async (role: UserRole) => {
    await setUserRole(role);
    router.push({ pathname: "/(auth)/login", params: { role } });
  };

  return (
    <ScreenContainer>
      <AppLogo />

      <Text style={styles.subtitle}>
        Select how you’re using Physio Companion.
      </Text>

      <PrimaryButton
        label="I’m a Patient"
        onPress={() => goToLogin("patient")}
        style={{ marginTop: 18 }}
      />

      <PrimaryButton
        label="I’m a Physiotherapist"
        onPress={() => goToLogin("physio")}
        style={{ marginTop: 12 }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  subtitle: { textAlign: "center", color: "#666", fontSize: 16, marginTop: 6 },
});
