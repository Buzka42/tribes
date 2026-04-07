import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Platform,
  ActivityIndicator,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { RootStackParamList } from "../navigation/AppNavigator";

import { useAuth } from "../hooks/useAuth";
import { useEvents, TribeVent } from "../hooks/useEvents";
import { useTribes } from "../hooks/useTribes";
import { Tribe } from "../types";
import { auth, db } from "../config/firebase";
import { signOut } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { Colors, Typography } from "../theme";
import {
  format,
  isToday,
  isTomorrow,
  isWeekend,
  addDays,
  startOfWeek,
  endOfWeek,
  addWeeks,
} from "date-fns";
import { Feather } from "@expo/vector-icons";
import { EVENT_CATEGORIES, CategoryGroupId } from "../data/categories";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Map, { Marker, Layer, Source, MapMouseEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Svg, { Path, Circle, Text as SvgText, G } from "react-native-svg";

const renderMoons = (sum: number, count: number) => {
  if (!count) return "🌕"; // default
  const avg = Math.max(1, Math.min(Math.round(sum / count), 5));
  return ["🌑", "🌒", "🌓", "🌔", "🌕"][avg - 1];
};

// Spirit asset map — defined at module level for performance
const SPIRIT_ASSETS: Record<string, any> = {
  cosmos: require("../assets/cosmos.png"),
  crystal: require("../assets/crystal.png"),
  forest: require("../assets/forest.png"),
  moonwarrior: require("../assets/moonwarrior.png"),
  shroom: require("../assets/shroom.png"),
  sun: require("../assets/sun.png"),
  sunwarrior: require("../assets/sunwarrior.png"),
  trident: require("../assets/trident.png"),
  yingyang: require("../assets/yingyang.png"),
};
const SPIRIT_LABELS: Record<string, string> = {
  cosmos: "Cosmos",
  crystal: "Crystal",
  forest: "Forest",
  moonwarrior: "Moon",
  shroom: "Shroom",
  sun: "Sun",
  sunwarrior: "Warrior",
  trident: "Trident",
  yingyang: "Yin Yang",
};

export default function MapScreen() {
  const { user } = useAuth();
  const {
    events,
    joinEvent,
    createEvent,
    deleteEvent,
    finalizeEvent,
    submitFeedback,
    getUserFeedback,
  } = useEvents();
  const {
    tribes,
    createTribe,
    applyToTribe,
    acceptApplicant,
    rejectApplicant,
    postAnnouncement,
    leaveTribe,
    removeMember,
    deleteTribe,
    updateTribe,
    promoteMember,
    demoteMember,
  } = useTribes();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [mode, setMode] = useState<
    | "map"
    | "wizard_details"
    | "wizard_location"
    | "event_chat"
    | "filters"
    | "search_map"
    | "create_tribe_wizard"
    | "tribe_panel"
  >("map");
  const [draft, setDraft] = useState({
    title: "",
    categoryId: "" as CategoryGroupId | "",
    categorySub: [] as string[],
    isPrivate: false,
    limit: "10",
    location: null as any,
    address: "",
    date: null as Date | null,
    ageGroup: "All Ages",
    gender: "Anyone",
    tribeId: "",
    cyclicalRule: "",
  });
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>(
    {},
  );
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [activeAgeFilters, setActiveAgeFilters] = useState<string[]>([]);
  const [expandedAge, setExpandedAge] = useState(false);
  const [activeGenderFilters, setActiveGenderFilters] = useState<string[]>([]);
  const [expandedGender, setExpandedGender] = useState(false);

  const toggleCategory = (catId: string) => {
    const newFilters = { ...activeFilters };
    if (newFilters[catId]) delete newFilters[catId];
    else newFilters[catId] = [];
    setActiveFilters(newFilters);
  };

  const toggleSubFilter = (catId: string, sub: string) => {
    const newFilters = { ...activeFilters };
    if (!newFilters[catId] || newFilters[catId].length === 0)
      newFilters[catId] = [sub];
    else {
      if (newFilters[catId].includes(sub)) {
        newFilters[catId] = newFilters[catId].filter((s) => s !== sub);
        if (newFilters[catId].length === 0) delete newFilters[catId];
      } else newFilters[catId].push(sub);
    }
    setActiveFilters(newFilters);
  };
  const [selectedEvent, setSelectedEvent] = useState<TribeVent | null>(null);
  const [dateFilter, setDateFilter] = useState("30 Days");
  const [tutStep, setTutStep] = useState(-1);
  const [selectedCluster, setSelectedCluster] = useState<{
    lat: number;
    lng: number;
    events: TribeVent[];
  } | null>(null);

  // Tribes UI State
  const [selectedTribe, setSelectedTribe] = useState<Tribe | null>(null);
  const [showManagement, setShowManagement] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  // Tribe Creation Wizard
  const [wizardDraft, setWizardDraft] = useState({
    name: "",
    description: "",
    spiritId: "forest",
    isPrivateTribe: false,
    categoryId: "",
    categorySub: [] as string[],
    fromEventId: "",
    fromAttendees: [] as string[],
  });
  const [wizardStep, setWizardStep] = useState(0);
  const [formTribeChecked, setFormTribeChecked] = useState(false);
  const [profileViewUid, setProfileViewUid] = useState<string | null>(null);
  const [profileViewData, setProfileViewData] = useState<any | null>(null);
  const [hasProcessedInvite, setHasProcessedInvite] = useState(false);
  // Event finalization & feedback
  const [finalizeChecked, setFinalizeChecked] = useState<string[]>([]);
  const [feedbackAnswer, setFeedbackAnswer] = useState<{
    eventHappened?: boolean;
    rating?: number;
  }>({});
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<
    Record<string, boolean>
  >({});
  const [userFeedbackCache, setUserFeedbackCache] = useState<
    Record<string, any | "none">
  >({});
  const [creatorStatsCache, setCreatorStatsCache] = useState<
    Record<string, { ratingSum: number; ratingCount: number; name?: string }>
  >({});
  const [showTribePrompt, setShowTribePrompt] = useState(false);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollRef = React.useRef<ScrollView>(null);
  const mapRef = React.useRef<any>(null);
  const [scrollX, setScrollX] = useState(0);
  const [currentZoom, setCurrentZoom] = useState(12.5);

  const [wizardQuery, setWizardQuery] = useState("");
  const [wizardSuggestions, setWizardSuggestions] = useState<any[]>([]);

  const searchWizardLocation = async (text: string) => {
    setWizardQuery(text);
    if (text.length < 3) return setWizardSuggestions([]);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}&autocomplete=true&types=place,address`,
      );
      const data = await res.json();
      setWizardSuggestions(data.features || []);
    } catch (e) {}
  };

  const dummyEvent: any = {
    id: "tutorial-dummy",
    title: "Sunset Hike 🌄",
    interest: "Hiking",
    categoryId: "outdoor",
    categorySub: ["Hiking"],
    ageGroup: "All Ages",
    gender: "Anyone",
    description:
      "A simulation event to learn how joining works. Your Leaves will be instantly refunded since this is a test!",
    location: {
      latitude: Number(user?.homeLocation?.latitude || 50.2649),
      longitude: Number(user?.homeLocation?.longitude || 19.0238),
    },
    creatorId: "system",
    creatorName: "The Tribes",
    time: Date.now(),
    participants: [],
    maxParticipants: 10,
  };

  let displayFilterEvents = events.filter((e) => e.status !== "cancelled" && e.status !== "finalized");
  if (activeAgeFilters.length > 0) {
    displayFilterEvents = displayFilterEvents.filter(
      (e) => e.ageGroup && activeAgeFilters.includes(e.ageGroup),
    );
  }
  if (activeGenderFilters.length > 0) {
    displayFilterEvents = displayFilterEvents.filter(
      (e) => e.gender && activeGenderFilters.includes(e.gender),
    );
  }
  if (Object.keys(activeFilters).length > 0) {
    displayFilterEvents = displayFilterEvents.filter((e) => {
      if (!e.categoryId) return false;
      const selectedSubs = activeFilters[e.categoryId];
      if (!selectedSubs) return false;
      if (selectedSubs.length === 0) return true;
      const eventSubs = Array.isArray(e.categorySub)
        ? e.categorySub
        : e.categorySub
          ? [e.categorySub as unknown as string]
          : [];
      return selectedSubs.some((sub) => eventSubs.includes(sub));
    });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (dateFilter !== "All") {
    displayFilterEvents = displayFilterEvents.filter((e) => {
      if (!e.time) return false;
      const t = new Date(e.time);
      if (dateFilter === "30 Days")
        return t >= todayStart && t <= addDays(todayStart, 30);
      if (dateFilter === "Today") return isToday(t);
      if (dateFilter === "Tomorrow") return isTomorrow(t);
      if (dateFilter === "Weekend")
        return t >= todayStart && t <= addDays(todayStart, 7) && isWeekend(t);
      if (dateFilter === "Next Week") {
        const nextWk = addWeeks(todayStart, 1);
        return (
          t >= startOfWeek(nextWk, { weekStartsOn: 1 }) &&
          t <= endOfWeek(nextWk, { weekStartsOn: 1 })
        );
      }
      return true;
    });
  }
  let displayEvents = displayFilterEvents;
  if (tutStep >= 6 && tutStep <= 7)
    displayEvents = [...displayEvents, dummyEvent];
  const joinedEvents = events.filter((e) => {
    if (!e.participants?.includes(user?.uid || "")) return false;
    if (e.status === "cancelled") return false;
    if (e.status === "finalized") {
      const isHost = e.creatorId === user?.uid;
      if (isHost) return false;
      if (feedbackSubmitted[e.id]) return false;
      return true;
    }
    return true;
  });
  const userTribes = tribes.filter((t) => t.members.includes(user?.uid || ""));

  // Load creator stats + feedback when event chat opens
  React.useEffect(() => {
    if (typeof window !== "undefined" && !hasProcessedInvite && tribes.length > 0) {
      const qs = new URLSearchParams(window.location.search);
      const inviteId = qs.get("invite");
      if (inviteId) {
        const inviteTribe = tribes.find((t) => t.id === inviteId);
        if (inviteTribe) {
          setSelectedTribe(inviteTribe);
          setMode("tribe_panel");
          window.history.replaceState({}, "", window.location.pathname);
          setHasProcessedInvite(true);
        }
      }
    }
  }, [tribes, hasProcessedInvite]);

  React.useEffect(() => {
    if (!profileViewUid) {
      setProfileViewData(null);
      return;
    }
    const fetchProfile = async () => {
      const docSnap = await getDoc(doc(db, "users", profileViewUid));
      if (docSnap.exists()) {
        setProfileViewData({ id: profileViewUid, ...docSnap.data() });
      }
    };
    fetchProfile();
  }, [profileViewUid]);

  React.useEffect(() => {
    if (!selectedEvent || selectedEvent.id === "tutorial-dummy") return;
    // Creator stats
    if (!creatorStatsCache[selectedEvent.creatorId]) {
      getDoc(doc(db, "users", selectedEvent.creatorId))
        .then((snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setCreatorStatsCache((prev) => ({
              ...prev,
              [selectedEvent.creatorId]: {
                name: d.displayName || "Unknown",
                ratingSum: d.ratingSum || 0,
                ratingCount: d.ratingCount || 0,
              },
            }));
          }
        })
        .catch(() => {});
    }
    // User feedback
    if (userFeedbackCache[selectedEvent.id] === undefined) {
      getUserFeedback(selectedEvent.id)
        .then((fb) => {
          setUserFeedbackCache((prev) => ({
            ...prev,
            [selectedEvent.id]: fb || "none",
          }));
        })
        .catch(() => {});
    }
    // Init finalize checkboxes
    setFinalizeChecked(
      selectedEvent.participants?.filter(
        (p) => p !== selectedEvent.creatorId,
      ) || [],
    );
    setFeedbackAnswer({});
  }, [selectedEvent?.id]);

  // --- CLUSTERING (zoom-aware) ---
  const clusteredMarkers = React.useMemo(() => {
    const RADIUS = 0.004 * Math.pow(2, 13 - currentZoom); // scales with zoom
    const used = new Set<string>();
    const clusters: { lat: number; lng: number; events: TribeVent[] }[] = [];
    for (const ev of displayEvents) {
      if (used.has(ev.id)) continue;
      const group: TribeVent[] = [ev];
      used.add(ev.id);
      for (const other of displayEvents) {
        if (used.has(other.id)) continue;
        const d = Math.sqrt(
          Math.pow(ev.location.latitude - other.location.latitude, 2) +
            Math.pow(ev.location.longitude - other.location.longitude, 2),
        );
        if (d < RADIUS) {
          group.push(other);
          used.add(other.id);
        }
      }
      const lat =
        group.reduce((s, e) => s + e.location.latitude, 0) / group.length;
      const lng =
        group.reduce((s, e) => s + e.location.longitude, 0) / group.length;
      clusters.push({ lat, lng, events: group });
    }
    return clusters;
  }, [displayEvents, currentZoom]);

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    setScrollX(contentOffset.x);
    setCanScrollLeft(contentOffset.x > 5);
    setCanScrollRight(
      contentOffset.x + layoutMeasurement.width < contentSize.width - 5,
    );
  };

  React.useEffect(() => {
    if (!user) return;
    if (user.hasSeenTutorial) return;
    // User exists but hasn't seen tutorial => show welcome
    setTutStep(0);
  }, [user?.uid, user?.hasSeenTutorial]);

  const markTutorialSeen = async () => {
    if (!user) return;
    setTutStep(-1);
    try {
      await updateDoc(doc(db, "users", user.uid), { hasSeenTutorial: true });
    } catch (e) {
      console.error("TUTORIAL MARK ERROR:", e);
    }
  };

  const handleMapClick = (e: MapMouseEvent) => {
    if (mode === "wizard_location") {
      setDraft({
        ...draft,
        location: { lat: e.lngLat.lat, lng: e.lngLat.lng },
      });
    }
  };

  const handleCreate = async () => {
    try {
      if (
        !draft.title ||
        !draft.categoryId ||
        (draft.categoryId !== "time_limited" &&
          draft.categorySub.length === 0) ||
        !draft.location ||
        !draft.date
      )
        return window.alert(
          "Incomplete\n\nMake sure title, category, subcategory, date and location are set.",
        );
      await createEvent(
        draft.title,
        draft.categoryId,
        draft.categorySub,
        parseInt(draft.limit) || 10,
        draft.isPrivate,
        5,
        {
          latitude: draft.location.lat,
          longitude: draft.location.lng,
          address: draft.address || "Pinned carefully on Map",
        },
        draft.date,
        draft.ageGroup,
        draft.gender,
        draft.tribeId || undefined,
        draft.cyclicalRule || undefined,
      );
      setMode("map");
      setDraft({
        title: "",
        categoryId: "",
        categorySub: [],
        isPrivate: false,
        limit: "10",
        location: null,
        address: "",
        date: null,
        ageGroup: "All Ages",
        gender: "Anyone",
        tribeId: "",
        cyclicalRule: "",
      });
      Alert.alert(
        "Tribe Assembled",
        "Your event is live. 5 Leaves were locked.",
      );
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleJoin = async () => {
    if (!selectedEvent || !user) return;
    if (selectedEvent.id === "tutorial-dummy") {
      if (Platform.OS === "web") {
        window.alert(
          "Congratulations! 🌟\n\nYou successfully joined your first event! Since this is a test simulation, your 1 Leaf 🍃 has been instantly refunded. Welcome to The Tribes!",
        );
        setSelectedEvent(null);
        setMode("map");
        setTutStep(-1);
        markTutorialSeen();
      } else {
        Alert.alert(
          "Congratulations! 🌟",
          "You successfully joined your first event! Since this is a test simulation, your 1 Leaf 🍃 has been instantly refunded. Welcome to The Tribes!",
          [
            {
              text: "Awesome!",
              onPress: () => {
                setSelectedEvent(null);
                setMode("map");
                setTutStep(-1);
              },
            },
          ],
        );
      }
      return;
    }
    if (user.tokens < 1) {
      if (typeof window !== "undefined") {
        window.alert("Out of Leaves! 🍂\nYou need at least 1 leaf to join. Wait for refunds from past events.");
      }
      return;
    }
    if (selectedEvent.participants.includes(user.uid)) {
      if (typeof window !== "undefined") window.alert("You are already signed up for this event!");
      return;
    }
    try {
      await joinEvent(selectedEvent.id);
      if (typeof window !== "undefined") window.alert("Joined! You've secured your spot. Chat is now unlocked!");
    } catch (e: any) {
      if (typeof window !== "undefined") window.alert("Error: " + e.message);
    }
  };

  // --- COMPONENT RENDERS ---

  const renderDevTools = () => {
    if (!user?.isDev) return null;
    return (
      <View style={styles.devPanel}>
        <Text style={styles.devTitle}>DEV TOOLS</Text>
        <TouchableOpacity style={styles.devBtn} onPress={() => setTutStep(1)}>
          <Text style={styles.devBtnText}>[TUT]</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.devBtn}
          onPress={async () => {
            const { doc, updateDoc, increment } =
              await import("firebase/firestore");
            await updateDoc(doc(db, "users", user.uid), {
              tokens: increment(100),
            });
          }}
        >
          <Text style={styles.devBtnText}>[+100 🍃]</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.devBtn}
          onPress={async () => {
            const { collection, query, where, getDocs, deleteDoc } =
              await import("firebase/firestore");
            const q = query(
              collection(db, "events"),
              where("creatorId", "==", user.uid),
            );
            const snaps = await getDocs(q);
            snaps.forEach((s) => deleteDoc(s.ref));
          }}
        >
          <Text style={styles.devBtnText}>[CLR]</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.devBtn}
          onPress={() => {
            setDraft({
              ...draft,
              title: "Dev Dummy Event",
              categoryId: "outdoor",
              categorySub: ["Hiking"],
              location: { lat: 50.2649, lng: 19.0238 },
              date: new Date(),
            });
            setMode("wizard_location");
          }}
        >
          <Text style={styles.devBtnText}>[PIN]</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderManagementOverlay = () => {
    if (!selectedTribe) return null;
    const isChief = selectedTribe.creatorId === user?.uid;
    const isLeader =
      isChief || (selectedTribe.leaders || []).includes(user?.uid || "");
    return (
      <View style={StyleSheet.absoluteFill}>
        <TouchableOpacity
          style={
            {
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(0,0,0,0.55)",
            } as any
          }
          activeOpacity={1}
          onPress={() => setShowManagement(false)}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(18,28,16,0.99)",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: 44,
            maxHeight: "82%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontFamily: Typography.heading,
                fontSize: 20,
                color: "#fff",
              }}
            >
              {isChief ? "👑 Chief Dashboard" : "🛡️ Council"}
            </Text>
            <TouchableOpacity
              onPress={() => setShowManagement(false)}
              style={{ padding: 6 }}
            >
              <Feather name="x" size={22} color="rgba(255,255,255,0.45)" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedTribe.pendingApplicants.length > 0 && (
              <View
                style={{
                  marginBottom: 18,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  padding: 16,
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: Typography.heading,
                    fontSize: 14,
                    marginBottom: 12,
                    color: Colors.accent,
                  }}
                >
                  {selectedTribe.pendingApplicants.length} Pending Applications
                </Text>
                {selectedTribe.pendingApplicants.map((appUid) => (
                  <View
                    key={appUid}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      padding: 12,
                      borderRadius: 10,
                      marginBottom: 8,
                    }}
                  >
                    <TouchableOpacity onPress={() => setProfileViewUid(appUid)}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: Typography.bodySemibold,
                          color: "#fff",
                          textDecorationLine: "underline"
                        }}
                      >
                        {selectedTribe.memberNames?.[appUid] || `User ${appUid.substring(0, 6)}…`}
                      </Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            await rejectApplicant(selectedTribe.id, appUid);
                            if (typeof window !== 'undefined') window.alert("Application rejected successfully.");
                          } catch (e) {
                            if (typeof window !== 'undefined') window.alert("Failed to reject application.");
                          }
                        }}
                        style={{
                          backgroundColor: Colors.danger,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: "bold",
                          }}
                        >
                          Reject
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            await acceptApplicant(selectedTribe.id, appUid);
                            if (typeof window !== 'undefined') window.alert("Applicant successfully initiated into the Tribe!");
                          } catch (e) {
                            if (typeof window !== 'undefined') window.alert("Failed to accept applicant.");
                          }
                        }}
                        style={{
                          backgroundColor: Colors.primary,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: "bold",
                          }}
                        >
                          Accept
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                padding: 16,
                borderRadius: 16,
                marginBottom: 18,
              }}
            >
              <Text
                style={{
                  fontFamily: Typography.heading,
                  fontSize: 14,
                  marginBottom: 10,
                  color: "#fff",
                }}
              >
                📣 Broadcast Signal
              </Text>
              <TextInput
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 14,
                  fontFamily: Typography.body,
                  textAlignVertical: "top",
                  height: 90,
                  color: "#fff",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                }}
                placeholder="Write an announcement to your tribe…"
                placeholderTextColor="rgba(255,255,255,0.28)"
                multiline
                value={announcementText}
                onChangeText={setAnnouncementText}
              />
              <TouchableOpacity
                onPress={async () => {
                  if (!announcementText.trim()) return;
                  await postAnnouncement(selectedTribe.id, announcementText);
                  setAnnouncementText("");
                  setShowManagement(false);
                }}
                style={{
                  backgroundColor: Colors.accent,
                  paddingVertical: 13,
                  borderRadius: 14,
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontFamily: Typography.bodyBold,
                    fontSize: 14,
                  }}
                >
                  Send Announcement
                </Text>
              </TouchableOpacity>
            </View>
            <Text
              style={{
                fontFamily: Typography.heading,
                fontSize: 14,
                marginBottom: 12,
                color: "#fff",
              }}
            >
              Members ({selectedTribe.members.length})
            </Text>
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: 16,
                overflow: "hidden",
                marginBottom: 18,
              }}
            >
              {selectedTribe.members.map((mUid, idx) => {
                const mIsLeader =
                  selectedTribe.creatorId === mUid ||
                  (selectedTribe.leaders || []).includes(mUid);
                const mIsChief = selectedTribe.creatorId === mUid;
                return (
                  <View
                    key={mUid}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 13,
                      borderBottomWidth:
                        idx === selectedTribe.members.length - 1 ? 0 : 1,
                      borderBottomColor: "rgba(255,255,255,0.05)",
                    }}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: mIsChief
                          ? Colors.accent
                          : mIsLeader
                            ? Colors.primary
                            : "rgba(255,255,255,0.12)",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 11,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "bold",
                          fontSize: 12,
                        }}
                      >
                        {selectedTribe.memberNames[mUid]?.charAt(0) || "?"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity onPress={() => setProfileViewUid(mUid)}>
                        <Text
                          style={{
                            fontFamily: Typography.bodySemibold,
                            color: "#fff",
                            fontSize: 13,
                            textDecorationLine: "underline",
                          }}
                        >
                          {selectedTribe.memberNames[mUid] || "Unknown"}
                        </Text>
                      </TouchableOpacity>
                      {mIsChief ? (
                        <Text style={{ fontSize: 10, color: Colors.accent }}>
                          Chief
                        </Text>
                      ) : mIsLeader ? (
                        <Text style={{ fontSize: 10, color: Colors.textLight }}>
                          Leader
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {isChief && !mIsChief && (
                        <TouchableOpacity
                          onPress={() => {
                            if (mIsLeader) demoteMember(selectedTribe.id, mUid);
                            else promoteMember(selectedTribe.id, mUid);
                          }}
                          style={{ padding: 7 }}
                        >
                          <Feather
                            name={mIsLeader ? "shield-off" : "shield"}
                            size={16}
                            color={
                              mIsLeader
                                ? "rgba(255,255,255,0.25)"
                                : Colors.accent
                            }
                          />
                        </TouchableOpacity>
                      )}
                      {!mIsChief && (isChief || (isLeader && !mIsLeader)) && (
                        <TouchableOpacity
                          onPress={() => {
                            if (
                              window.confirm(
                                `Remove ${selectedTribe.memberNames[mUid]}?`,
                              )
                            )
                              removeMember(selectedTribe.id, mUid);
                          }}
                          style={{ padding: 7 }}
                        >
                          <Feather
                            name="user-x"
                            size={16}
                            color={Colors.danger}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
            {isChief && (
              <TouchableOpacity
                onPress={() => {
                  if (
                    window.confirm("DANGER: Permanently dissolve the tribe?")
                  ) {
                    deleteTribe(selectedTribe.id);
                    setSelectedTribe(null);
                    setShowManagement(false);
                  }
                }}
                style={{
                  backgroundColor: "rgba(163,83,83,0.18)",
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: Colors.danger,
                }}
              >
                <Text
                  style={{
                    fontFamily: Typography.bodyBold,
                    color: Colors.danger,
                  }}
                >
                  Dissolve Tribe ☠️
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderTribePanel = () => {
    if (!selectedTribe) return null;
    const isChief = selectedTribe.creatorId === user?.uid;
    const isLeader =
      isChief || (selectedTribe.leaders || []).includes(user?.uid || "");
    const isMember = selectedTribe.members.includes(user?.uid || "");
    const hasApplied = selectedTribe.pendingApplicants.includes(
      user?.uid || "",
    );
    const tribeEvents = events
      .filter((e) => e.tribeId === selectedTribe.id)
      .sort((a, b) => a.time.getTime() - b.time.getTime());
    const spiritKey = (selectedTribe.spiritId || "forest") as string;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Dark forest backdrop */}
        <View
          style={
            {
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(14, 22, 12, 0.98)",
            } as any
          }
        />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: 50,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.06)",
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setSelectedTribe(null);
              setShowManagement(false);
              setMode("map");
            }}
            style={{ padding: 10, marginRight: 6 }}
          >
            <Feather
              name="arrow-left"
              size={24}
              color="rgba(255,255,255,0.8)"
            />
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: Typography.heading,
              fontSize: 22,
              color: "#fff",
              flex: 1,
            }}
            numberOfLines={1}
          >
            {selectedTribe.name}
          </Text>
          {isLeader && (
            <TouchableOpacity
              onPress={() => setShowManagement(true)}
              style={{
                padding: 9,
                backgroundColor: "rgba(230,161,92,0.15)",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(230,161,92,0.35)",
              }}
            >
              <Feather name="shield" size={18} color={Colors.accent} />
            </TouchableOpacity>
          )}
        </View>

        {/* Spirit + Bonfire Hero */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            marginBottom: 6,
            backgroundColor: "rgba(38, 24, 8, 0.75)",
            borderRadius: 24,
            padding: 18,
            flexDirection: "row",
            alignItems: "flex-end",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <Image
            source={SPIRIT_ASSETS[spiritKey] || SPIRIT_ASSETS.forest}
            style={{ width: 160, height: 160, resizeMode: "contain" }}
          />
          <Image
            source={require("../assets/bonfire.png")}
            style={
              {
                width: 64,
                height: 64,
                resizeMode: "contain",
                marginLeft: 12,
                overflow: "visible",
                filter: "drop-shadow(0 0 12px rgba(255,140,0,0.7))",
              } as any
            }
          />
          <View style={{ flex: 1, paddingLeft: 14 }}>
            <Text
              style={{
                fontFamily: Typography.heading,
                fontSize: 17,
                color: "#fff",
                marginBottom: 4,
              }}
              numberOfLines={1}
            >
              {selectedTribe.name}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: Colors.accent,
                fontWeight: "bold",
                marginBottom: 6,
              }}
            >
              🌿 {selectedTribe.members.length} Tribesmen
            </Text>
            <Text
              style={{
                fontFamily: Typography.body,
                color: "rgba(255,255,255,0.55)",
                fontSize: 12,
                lineHeight: 17,
              }}
              numberOfLines={3}
            >
              {selectedTribe.description}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
          {/* Member Actions */}
          {!isMember && !hasApplied && (
            <TouchableOpacity
              style={{
                backgroundColor: Colors.accent,
                paddingVertical: 15,
                borderRadius: 16,
                alignItems: "center",
                marginBottom: 16,
              }}
              onPress={async () => {
                await applyToTribe(selectedTribe.id);
                if (typeof window !== 'undefined') window.alert("Your smoke signal was sent to the chief!");
              }}
            >
              <Text
                style={{
                  fontFamily: Typography.bodyBold,
                  color: "#fff",
                  fontSize: 15,
                }}
              >
                Apply to Tribe 🔥
              </Text>
            </TouchableOpacity>
          )}
          {!isMember && hasApplied && (
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.07)",
                paddingVertical: 15,
                borderRadius: 16,
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: Typography.bodyBold,
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 15,
                }}
              >
                Application Pending…
              </Text>
            </View>
          )}
          {isMember && (
            <TouchableOpacity
              style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                paddingVertical: 15,
                borderRadius: 16,
                alignItems: "center",
                marginBottom: 12,
                flexDirection: "row",
                justifyContent: "center",
              }}
              onPress={() => {
                try {
                  const l = `${window.location.origin}/?invite=${selectedTribe.id}`;
                  navigator.clipboard.writeText(l);
                  alert("Invite link copied to clipboard!");
                } catch (e) {
                  alert("Failed to copy link");
                }
              }}
            >
              <Feather name="link" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ fontFamily: Typography.bodyBold, color: "#fff", fontSize: 15 }}>
                Copy Invite Link
              </Text>
            </TouchableOpacity>
          )}
          {isMember && !isChief && (
            <TouchableOpacity
              style={{
                backgroundColor: "rgba(163,83,83,0.2)",
                paddingVertical: 15,
                borderRadius: 16,
                alignItems: "center",
                marginBottom: 16,
                borderWidth: 1,
                borderColor: Colors.danger,
              }}
              onPress={() =>
                Alert.alert("Leave Tribe", "Are you sure?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Leave",
                    style: "destructive",
                    onPress: async () => {
                      await leaveTribe(selectedTribe.id);
                      setSelectedTribe(null);
                    },
                  },
                ])
              }
            >
              <Text
                style={{
                  fontFamily: Typography.bodyBold,
                  color: Colors.danger,
                  fontSize: 15,
                }}
              >
                Leave Tribe
              </Text>
            </TouchableOpacity>
          )}

          {/* 🔥 Campfire — Announcements */}
          <Text
            style={{
              fontFamily: Typography.heading,
              fontSize: 17,
              color: Colors.accent,
              marginBottom: 12,
              marginTop: 4,
            }}
          >
            🔥 Campfire
          </Text>
          {selectedTribe.announcements.length === 0 ? (
            <Text
              style={{
                color: "rgba(255,255,255,0.3)",
                fontStyle: "italic",
                marginBottom: 20,
                fontFamily: Typography.body,
              }}
            >
              No signs of smoke yet.
            </Text>
          ) : (
            <View style={{ marginBottom: 20 }}>
              {selectedTribe.announcements
                .slice()
                .reverse()
                .map((ann, i) => (
                  <View
                    key={i}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.05)",
                      padding: 14,
                      borderRadius: 14,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.07)",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: Typography.body,
                        color: "rgba(255,255,255,0.82)",
                        fontSize: 14,
                        lineHeight: 21,
                      }}
                    >
                      {ann.text}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: 8,
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: "rgba(255,255,255,0.06)",
                      }}
                    >
                      <TouchableOpacity onPress={() => setProfileViewUid(ann.authorId)}>
                        <Text
                          style={{
                            fontSize: 11,
                            color: Colors.accent,
                            fontWeight: "bold",
                            textDecorationLine: "underline",
                          }}
                        >
                          {ann.authorName}
                        </Text>
                      </TouchableOpacity>
                      <Text
                        style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}
                      >
                        {format(ann.createdAt, "MMM d, HH:mm")}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          )}

          {/* 🌲 Gatherings — Events */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontFamily: Typography.heading,
                fontSize: 17,
                color: Colors.accent,
              }}
            >
              🌲 Gatherings
            </Text>
            {isLeader && (
              <TouchableOpacity
                onPress={() => {
                  setDraft({
                    ...draft,
                    tribeId: selectedTribe.id,
                    categoryId: selectedTribe.categoryId as any,
                  });
                  setMode("wizard_details");
                }}
                style={{
                  backgroundColor: "rgba(230,161,92,0.15)",
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "rgba(230,161,92,0.4)",
                }}
              >
                <Text
                  style={{
                    color: Colors.accent,
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                >
                  + New
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {tribeEvents.length === 0 ? (
            <Text
              style={{
                color: "rgba(255,255,255,0.3)",
                fontStyle: "italic",
                fontFamily: Typography.body,
                marginBottom: 20,
              }}
            >
              No upcoming gatherings.
            </Text>
          ) : (
            tribeEvents.map((e) => (
              <TouchableOpacity
                key={e.id}
                onPress={() => {
                  setSelectedEvent(e);
                  setMode("event_chat");
                }}
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  padding: 14,
                  borderRadius: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.07)",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: Typography.heading,
                      fontSize: 14,
                      color: "#fff",
                      flex: 1,
                    }}
                  >
                    {e.title}
                  </Text>
                  {e.cyclicalRule && (
                    <View
                      style={{
                        backgroundColor: Colors.accent,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: "bold",
                        }}
                      >
                        {e.cyclicalRule.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {e.status === "finalized" && (
                    <View
                      style={{
                        backgroundColor: Colors.primary,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 10,
                        marginLeft: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: "bold",
                        }}
                      >
                        DONE
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    marginTop: 4,
                    fontFamily: Typography.body,
                    fontSize: 12,
                  }}
                >
                  {format(e.time, "EEEE, MMM d at h:mm a")}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Management overlay (leader only) */}
        {showManagement && renderManagementOverlay()}
      </View>
    );
  };

  const renderHUD = () => {
    if (mode !== "map") return null;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate("Settings")}
        >
          <BlurView intensity={65} tint="light" style={styles.iconWrapper}>
            <Text style={{ fontSize: 16 }}>⚙️</Text>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.locateBtn}
          onPress={() => {
            if (user?.homeLocation && mapRef.current) {
              mapRef.current.flyTo({
                center: [
                  user.homeLocation.longitude,
                  user.homeLocation.latitude,
                ],
                zoom: 12.5,
                duration: 1000,
              });
            }
          }}
        >
          <BlurView intensity={65} tint="light" style={styles.iconWrapper}>
            <Feather name="navigation" size={18} color={Colors.text} />
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.locateBtn, { top: 170 }]}
          onPress={() => {
            setMode("search_map");
          }}
        >
          <BlurView intensity={65} tint="light" style={[styles.iconWrapper]}>
            <Feather name="search" size={18} color={Colors.text} />
          </BlurView>
        </TouchableOpacity>

        <View style={styles.topLeft} pointerEvents="box-none">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 15 }}>
            <BlurView intensity={70} tint="light" style={styles.balancePill}>
              <Text style={styles.balanceText}>
                {user?.tokens}{" "}
                <Image
                  source={require("../assets/leaf.png")}
                  style={styles.inlineIcon}
                />
              </Text>
            </BlurView>
            {userTribes.map((usrTribe) => (
              <TouchableOpacity
                key={usrTribe.id}
                onPress={() => {
                  setSelectedTribe(usrTribe);
                  setMode("tribe_panel");
                }}
                style={{
                  backgroundColor: "rgba(255,255,255,0.7)",
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.4)",
                  marginLeft: 4,
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, overflow: "hidden", alignItems: "center" }}>
                  <Image
                    source={SPIRIT_ASSETS[usrTribe.spiritId || "forest"]}
                    style={{ width: 130, height: 130, resizeMode: "contain", marginTop: 2 }}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.upcomingRow}>
            <TouchableOpacity
              style={styles.plusBtn}
              onPress={() => setMode("wizard_details")}
            >
              <Feather name="plus" size={28} color="#fff" />
            </TouchableOpacity>

            {joinedEvents.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.upcomingScroll}
              >
                {joinedEvents.map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    style={styles.upcomingIcon}
                    onPress={() => {
                      setSelectedEvent(e);
                      setMode("event_chat");
                    }}
                  >
                    <Text style={styles.upcomingInitial}>
                      {e.title.charAt(0)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        <View style={styles.bottomBar} pointerEvents="box-none">
          <BlurView
            intensity={60}
            tint="light"
            style={styles.dateSliderContainer}
          >
            {canScrollLeft && (
              <TouchableOpacity
                style={styles.scrollIndicatorLeft}
                onPress={() =>
                  scrollRef.current?.scrollTo({
                    x: Math.max(0, scrollX - 150),
                    animated: true,
                  })
                }
              >
                <Feather
                  name="chevron-left"
                  size={16}
                  color={Colors.primaryDark}
                />
              </TouchableOpacity>
            )}
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12 }}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {[
                "30 Days",
                "Today",
                "Tomorrow",
                "Weekend",
                "Next Week",
                "All",
              ].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDateFilter(d)}
                  style={[
                    styles.datePill,
                    dateFilter === d && styles.datePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.datePillText,
                      dateFilter === d && styles.datePillTextActive,
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {canScrollRight && (
              <TouchableOpacity
                style={styles.scrollIndicatorRight}
                onPress={() =>
                  scrollRef.current?.scrollTo({
                    x: scrollX + 150,
                    animated: true,
                  })
                }
              >
                <Feather
                  name="chevron-right"
                  size={16}
                  color={Colors.primaryDark}
                />
              </TouchableOpacity>
            )}
          </BlurView>

          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setMode("filters")}
          >
            <BlurView
              intensity={70}
              tint="light"
              style={[
                styles.filterBtnWrapper,
                Object.keys(activeFilters).length +
                  activeAgeFilters.length +
                  activeGenderFilters.length >
                  0 && {
                  backgroundColor: Colors.primary,
                  borderColor: Colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  Object.keys(activeFilters).length +
                    activeAgeFilters.length +
                    activeGenderFilters.length >
                    0 && { color: "#fff" },
                ]}
              >
                Filters{" "}
                {Object.keys(activeFilters).length +
                  activeAgeFilters.length +
                  activeGenderFilters.length >
                0
                  ? `(${Object.keys(activeFilters).length + activeAgeFilters.length + activeGenderFilters.length})`
                  : "☰"}
              </Text>
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMapSearch = () => {
    if (mode !== "search_map") return null;
    return (
      <View
        style={{
          position: "absolute",
          top: 50,
          left: 20,
          right: 20,
          zIndex: 1000,
        }}
      >
        <BlurView
          intensity={90}
          tint="light"
          style={{ padding: 15, borderRadius: 24, overflow: "hidden" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  marginBottom: 0,
                  paddingVertical: 12,
                  marginRight: 10,
                },
              ]}
              placeholder="Search city, neighborhood..."
              placeholderTextColor="#999"
              autoFocus
              value={wizardQuery}
              onChangeText={searchWizardLocation}
            />
            <TouchableOpacity
              onPress={() => {
                setMode("map");
                setWizardQuery("");
                setWizardSuggestions([]);
              }}
              style={{ padding: 8 }}
            >
              <Feather name="x" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          {wizardSuggestions.length > 0 && (
            <View style={{ marginTop: 10 }}>
              {wizardSuggestions.slice(0, 4).map((feat, i) => (
                <TouchableOpacity
                  key={i}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(0,0,0,0.05)",
                  }}
                  onPress={() => {
                    const [lng, lat] = feat.center;
                    if (mapRef.current) {
                      mapRef.current.flyTo({
                        center: [lng, lat],
                        zoom: 12.5,
                        duration: 1000,
                      });
                    }
                    setMode("map");
                    setWizardQuery("");
                    setWizardSuggestions([]);
                  }}
                >
                  <Text
                    style={{
                      fontFamily: Typography.bodySemibold,
                      fontSize: 14,
                    }}
                  >
                    {feat.place_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </BlurView>
      </View>
    );
  };

  const renderWizardDetails = () => (
    <View style={styles.glassWrapperBottom}>
      <BlurView intensity={85} tint="light" style={styles.glassPanelBottom}>
        <Text style={styles.panelTitle}>Design your tribe's event</Text>
        <TextInput
          style={styles.input}
          placeholder="Title (e.g. Morning Run)"
          placeholderTextColor="#999"
          value={draft.title}
          onChangeText={(t) => setDraft({ ...draft, title: t })}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: draft.categoryId ? 10 : 20 }}
        >
          {EVENT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.wizardCat,
                draft.categoryId === cat.id && {
                  backgroundColor: cat.color,
                  borderColor: cat.color,
                },
              ]}
              onPress={() =>
                setDraft({
                  ...draft,
                  categoryId: cat.id as CategoryGroupId,
                  categorySub: [],
                })
              }
            >
              <Feather
                name={cat.icon}
                size={14}
                color={draft.categoryId === cat.id ? "#fff" : Colors.text}
              />
              <Text
                style={[
                  styles.wizardCatText,
                  draft.categoryId === cat.id && { color: "#fff" },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {draft.categoryId &&
        EVENT_CATEGORIES.find((c) => c.id === draft.categoryId)?.subgroups
          .length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20 }}
          >
            {EVENT_CATEGORIES.find(
              (c) => c.id === draft.categoryId,
            )?.subgroups.map((sub) => {
              const catColor =
                EVENT_CATEGORIES.find((ce) => ce.id === draft.categoryId)
                  ?.color || Colors.primary;
              const isActive = draft.categorySub.includes(sub);
              return (
                <TouchableOpacity
                  key={sub}
                  style={[
                    styles.wizardSubCat,
                    isActive && { backgroundColor: catColor },
                  ]}
                  onPress={() => {
                    const subs = draft.categorySub;
                    if (subs.includes(sub)) {
                      setDraft({
                        ...draft,
                        categorySub: subs.filter((s) => s !== sub),
                      });
                    } else {
                      if (subs.length < 5) {
                        setDraft({ ...draft, categorySub: [...subs, sub] });
                      } else {
                        if (Platform.OS === "web")
                          window.alert("You can select up to 5 subcategories.");
                        else
                          Alert.alert(
                            "Limit Reached",
                            "You can select up to 5 subcategories.",
                          );
                      }
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.wizardSubCatText,
                      isActive && { color: "#fff" },
                    ]}
                  >
                    {sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        <Text
          style={{
            fontFamily: Typography.bodySemibold,
            color: Colors.text,
            marginBottom: 5,
            marginTop: draft.categoryId ? 0 : 20,
            alignSelf: "flex-start",
            marginLeft: "4%",
          }}
        >
          Target Age Group (Optional)
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
        >
          {["All Ages", "Under 18", "18-25", "26-35", "36-45", "45+"].map(
            (age) => (
              <TouchableOpacity
                key={age}
                style={[
                  styles.wizardSubCat,
                  draft.ageGroup === age && {
                    backgroundColor: Colors.primary,
                    borderColor: Colors.primary,
                  },
                ]}
                onPress={() => setDraft({ ...draft, ageGroup: age })}
              >
                <Text
                  style={[
                    styles.wizardSubCatText,
                    draft.ageGroup === age && { color: "#fff" },
                  ]}
                >
                  {age}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>

        <Text
          style={{
            fontFamily: Typography.bodySemibold,
            color: Colors.text,
            marginBottom: 5,
            marginTop: 10,
            alignSelf: "flex-start",
            marginLeft: "4%",
          }}
        >
          Target Gender (Optional)
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
        >
          {["Anyone", "Male", "Female", "LGBTQIA+"].map((gender) => (
            <TouchableOpacity
              key={gender}
              style={[
                styles.wizardSubCat,
                draft.gender === gender && {
                  backgroundColor: Colors.primary,
                  borderColor: Colors.primary,
                },
              ]}
              onPress={() => setDraft({ ...draft, gender })}
            >
              <Text
                style={[
                  styles.wizardSubCatText,
                  draft.gender === gender && { color: "#fff" },
                ]}
              >
                {gender}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* @ts-ignore */}
        <input
          type="datetime-local"
          value={draft.date ? format(draft.date, "yyyy-MM-dd'T'HH:mm") : ""}
          onChange={(e: any) =>
            setDraft({ ...draft, date: new Date(e.target.value) })
          }
          style={{
            width: "92%",
            padding: "16px",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.8)",
            backgroundColor: "rgba(255,255,255,0.8)",
            fontFamily: Typography.body,
            fontSize: "15px",
            color: Colors.text,
            marginBottom: "15px",
            alignSelf: "center",
            boxSizing: "border-box",
          }}
        />

        <TextInput
          style={styles.input}
          placeholder="Location Base (City/Street)"
          placeholderTextColor="#999"
          value={wizardQuery}
          onChangeText={searchWizardLocation}
        />
        {wizardSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {wizardSuggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionItem}
                onPress={() => {
                  setDraft({
                    ...draft,
                    location: { lat: s.center[1], lng: s.center[0] },
                    address: s.place_name,
                  });
                  setWizardSuggestions([]);
                  setWizardQuery(s.place_name);
                }}
              >
                <Text style={styles.suggestionText}>{s.place_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.panelTitle}>Frequency</Text>
        <Text
          style={{
            fontFamily: Typography.body,
            color: "#666",
            marginBottom: 10,
            marginTop: -15,
          }}
        >
          Should this gathering happen regularly?
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
        >
          {["once", "weekly", "monthly"].map((rule) => (
            <TouchableOpacity
              key={rule}
              onPress={() =>
                setDraft({
                  ...draft,
                  cyclicalRule: rule === "once" ? "" : rule,
                })
              }
              style={[
                styles.wizardSubCat,
                (draft.cyclicalRule === rule ||
                  (rule === "once" && !draft.cyclicalRule)) && {
                  backgroundColor: Colors.primary,
                  borderColor: Colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.wizardSubCatText,
                  (draft.cyclicalRule === rule ||
                    (rule === "once" && !draft.cyclicalRule)) && {
                    color: "#fff",
                  },
                ]}
              >
                {rule === "once"
                  ? "One-time"
                  : rule.charAt(0).toUpperCase() + rule.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.row}>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => setMode("map")}
          >
            <Text style={styles.btnSecondaryText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => {
              if (draft.location)
                mapRef.current?.flyTo({
                  center: [draft.location.lng, draft.location.lat],
                  zoom: 14,
                });
              setMode("wizard_location");
            }}
          >
            <Text style={styles.btnPrimaryText}>Set Path 📍</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );

  const renderWizardLocation = () => (
    <View style={styles.glassWrapperTop}>
      <BlurView intensity={90} tint="dark" style={styles.glassPanelTop}>
        <Text style={styles.panelTitleDark}>Drop the exact pin</Text>
        <Text style={styles.panelSubDark}>
          Tap anywhere on the map to anchor coordinates.
        </Text>
        {draft.location && (
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => setMode("wizard_details")}
            >
              <Text style={styles.btnSecondaryTextDark}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleCreate}>
              <Text style={styles.btnPrimaryText}>
                Lock 5{" "}
                <Image
                  source={require("../assets/leaf.png")}
                  style={styles.inlineIcon}
                  tintColor="#fff"
                />{" "}
                & Finalize
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </BlurView>
    </View>
  );

  const renderEventChat = () => {
    if (!selectedEvent) return null;
    const isJoined = selectedEvent.participants.includes(user?.uid || "");
    const isHost = selectedEvent.creatorId === user?.uid;
    const isPastEvent =
      selectedEvent.time && new Date(selectedEvent.time) <= new Date();
    const isFinalized =
      selectedEvent.status === "finalized" ||
      selectedEvent.status === "cancelled";
    const creatorStats = creatorStatsCache[selectedEvent.creatorId] || {
      name: "Unknown",
      ratingSum: 0,
      ratingCount: 0,
    };
    const myFeedback = userFeedbackCache[selectedEvent.id];
    const isPrivateTribe = selectedEvent.isTribePrivate;
    const tribeInfo = selectedEvent.tribeId
      ? tribes.find((t) => t.id === selectedEvent.tribeId)
      : null;

    return (
      <View style={styles.glassWrapperBottomFull}>
        <BlurView
          intensity={90}
          tint="light"
          style={styles.glassPanelBottomFull}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    fontFamily: Typography.heading,
                    fontSize: 24,
                    color: Colors.text,
                    marginRight: 6,
                  }}
                  numberOfLines={1}
                >
                  {selectedEvent.title}
                </Text>
                {isPrivateTribe && (
                  <View
                    style={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      PRIVATE TRIBE
                    </Text>
                  </View>
                )}
                {isFinalized && (
                  <View
                    style={{
                      backgroundColor:
                        selectedEvent.status === "cancelled"
                          ? Colors.danger
                          : Colors.primary,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      {selectedEvent.status?.toUpperCase() || ""}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={{
                  fontFamily: Typography.body,
                  fontSize: 13,
                  color: Colors.textLight,
                }}
              >
                {selectedEvent.participants.length} /{" "}
                {selectedEvent.participantLimit} Attending •{" "}
                {selectedEvent.time
                  ? format(new Date(selectedEvent.time), "MMM d, h:mm a")
                  : "TBD"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                <Text style={{ fontFamily: Typography.bodySemibold, fontSize: 13, color: Colors.text }}>
                  Host:{" "}
                </Text>
                <TouchableOpacity onPress={() => setProfileViewUid(selectedEvent.creatorId)}>
                  <Text
                    style={{
                      fontFamily: Typography.bodySemibold,
                      fontSize: 13,
                      color: Colors.text,
                      textDecorationLine: "underline",
                    }}
                  >
                    {creatorStats.name || "Unknown"}
                  </Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 13, marginLeft: 8 }}>
                  {renderMoons(creatorStats.ratingSum, creatorStats.ratingCount)}
                </Text>
              </View>
              {tribeInfo && !isPrivateTribe && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTribe(tribeInfo);
                    setMode("map");
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 8,
                    backgroundColor: "rgba(140,179,105,0.15)",
                    alignSelf: "flex-start",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(140,179,105,0.3)",
                  }}
                >
                  <Image
                    source={SPIRIT_ASSETS[tribeInfo.spiritId || "forest"]}
                    style={{ width: 16, height: 16, marginRight: 6 }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: Colors.primaryDark,
                      fontWeight: "bold",
                    }}
                  >
                    Hosted by {tribeInfo.name}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {isHost && !isFinalized && !isPastEvent && (
              <TouchableOpacity
                onPress={async () => {
                  if (selectedEvent.id === "tutorial-dummy") {
                    setSelectedEvent(null);
                    setMode("map");
                    return;
                  }
                  if (
                    window.confirm(
                      "Are you sure you want to cancel this event? 5 leaves will be refunded.",
                    )
                  ) {
                    try {
                      await deleteEvent(selectedEvent.id);
                      setSelectedEvent(null);
                      setMode("map");
                    } catch (e: any) {
                      alert("Error: " + e.message);
                    }
                  }
                }}
                style={{ padding: 8 }}
              >
                <Feather name="trash-2" size={20} color={Colors.danger} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                setSelectedEvent(null);
                setMode("map");
              }}
              style={{ padding: 8 }}
            >
              <Feather name="x" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <Text
            style={{
              fontFamily: Typography.bodySemibold,
              color: Colors.primaryDark,
              marginBottom: 12,
            }}
            numberOfLines={1}
          >
            📍 {selectedEvent.location.address || "Precise map location pinned"}
          </Text>

          {/* Content Area */}
          {!isJoined && !isHost ? (
            <View style={styles.chatLocked}>
              <Text style={styles.chatLockedIco}>💬</Text>
              <Text style={styles.chatLockedTitle}>Tribal Chat is Locked</Text>
              <Text style={styles.chatLockedSub}>
                Commit 1{" "}
                <Image
                  source={require("../assets/leaf.png")}
                  style={styles.inlineIcon}
                />{" "}
                to join the event and open communications with this tribe.
              </Text>
              <TouchableOpacity
                style={[styles.btnPrimaryFull, isFinalized && { opacity: 0.5 }]}
                disabled={isFinalized}
                onPress={handleJoin}
              >
                <Text style={styles.btnPrimaryText}>
                  {isFinalized ? "Event Concluded" : "Join Tribe (1 🍃)"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView
                style={styles.chatScroll}
                contentContainerStyle={{
                  paddingVertical: 10,
                  paddingBottom: 20,
                }}
              >
                <View style={styles.chatBubble}>
                  <Text style={styles.chatText}>
                    Welcome to the tribe! See you there.
                  </Text>
                </View>
              </ScrollView>

              {/* Finalize Mode for Host */}
              {isHost && isPastEvent && !isFinalized && (
                <View
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 16,
                    padding: 16,
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    marginTop: 10,
                    borderWidth: 1,
                    borderColor: Colors.accent,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: Typography.heading,
                      fontSize: 16,
                      color: Colors.accent,
                      marginBottom: 8,
                    }}
                  >
                    🔥 The Event Has Passed
                  </Text>
                  <Text
                    style={{
                      fontFamily: Typography.body,
                      fontSize: 13,
                      color: Colors.textLight,
                      marginBottom: 16,
                    }}
                  >
                    Mark who attended. You will receive your 5 leaves back if
                    you confirm it happened.
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor:
                          feedbackAnswer.eventHappened === true
                            ? Colors.primary
                            : "#f0f0f0",
                        alignItems: "center",
                      }}
                      onPress={() =>
                        setFeedbackAnswer({
                          ...feedbackAnswer,
                          eventHappened: true,
                        })
                      }
                    >
                      <Text
                        style={{
                          color:
                            feedbackAnswer.eventHappened === true
                              ? "#fff"
                              : "#666",
                          fontWeight: "bold",
                        }}
                      >
                        It Happened 👍
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor:
                          feedbackAnswer.eventHappened === false
                            ? Colors.danger
                            : "#f0f0f0",
                        alignItems: "center",
                      }}
                      onPress={() =>
                        setFeedbackAnswer({
                          ...feedbackAnswer,
                          eventHappened: false,
                        })
                      }
                    >
                      <Text
                        style={{
                          color:
                            feedbackAnswer.eventHappened === false
                              ? "#fff"
                              : "#666",
                          fontWeight: "bold",
                        }}
                      >
                        Cancelled 👎
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {feedbackAnswer.eventHappened &&
                    selectedEvent.participants.length > 1 && (
                      <View style={{ marginBottom: 16 }}>
                        <Text
                          style={{
                            fontFamily: Typography.bodySemibold,
                            marginBottom: 8,
                          }}
                        >
                          Tick who showed up:
                        </Text>
                        {selectedEvent.participants
                          .filter((p) => p !== user.uid)
                          .map((p) => (
                            <TouchableOpacity
                              key={p}
                              onPress={() => {
                                setFinalizeChecked((prev) =>
                                  prev.includes(p)
                                    ? prev.filter((x) => x !== p)
                                    : [...prev, p],
                                );
                              }}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 8,
                              }}
                            >
                              <View
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 12,
                                  borderWidth: 2,
                                  borderColor: finalizeChecked.includes(p)
                                    ? Colors.primary
                                    : "#ddd",
                                  backgroundColor: finalizeChecked.includes(p)
                                    ? Colors.primary
                                    : "transparent",
                                  marginRight: 10,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {finalizeChecked.includes(p) && (
                                  <Feather
                                    name="check"
                                    size={14}
                                    color="#fff"
                                  />
                                )}
                              </View>
                              <Text
                                style={{
                                  fontFamily: Typography.body,
                                  color: Colors.text,
                                }}
                              >
                                User {p.substring(0, 5)}...
                              </Text>
                            </TouchableOpacity>
                          ))}
                      </View>
                    )}
                  {feedbackAnswer.eventHappened && !selectedEvent.tribeId && (
                    <TouchableOpacity
                      onPress={() => setFormTribeChecked(!formTribeChecked)}
                      style={{ flexDirection: "row", alignItems: "center", marginBottom: 15 }}
                    >
                      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: formTribeChecked ? Colors.primary : "#ccc", backgroundColor: formTribeChecked ? Colors.primary : "transparent", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                        {formTribeChecked && <Feather name="check" size={14} color="#fff" />}
                      </View>
                      <Text style={{ fontFamily: Typography.bodySemibold, color: Colors.text }}>
                        Form a permanent Tribe from these attendees
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    disabled={feedbackAnswer.eventHappened === undefined}
                    style={[
                      styles.btnPrimaryFull,
                      {
                        opacity:
                          feedbackAnswer.eventHappened !== undefined ? 1 : 0.5,
                        marginTop: 0,
                      },
                    ]}
                    onPress={async () => {
                      await finalizeEvent(
                        selectedEvent.id,
                        finalizeChecked,
                        feedbackAnswer.eventHappened!,
                      );
                      if (
                        feedbackAnswer.eventHappened &&
                        !selectedEvent.tribeId &&
                        formTribeChecked
                      ) {
                        setWizardDraft((prev) => ({
                          ...prev,
                          fromEventId: selectedEvent.id,
                          fromAttendees: [user.uid, ...finalizeChecked],
                        }));
                        setMode("create_tribe_wizard");
                        setWizardStep(1);
                      } else {
                        setSelectedEvent(null);
                        setMode("map");
                        alert("Event Finalized! Leaves refunded.");
                      }
                    }}
                  >
                    <Text style={styles.btnPrimaryText}>Lock & Finalize</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Feedback Mode for Participant */}
              {!isHost &&
                isJoined &&
                (isFinalized || isPastEvent) &&
                myFeedback === "none" &&
                !feedbackSubmitted[selectedEvent.id] && (
                  <View
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: 16,
                      padding: 16,
                      shadowColor: "#000",
                      shadowOpacity: 0.05,
                      shadowRadius: 10,
                      marginTop: 10,
                      borderWidth: 1,
                      borderColor: Colors.accent,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: Typography.heading,
                        fontSize: 16,
                        color: Colors.accent,
                        marginBottom: 8,
                      }}
                    >
                      🌿 Claim Your Leaf Back
                    </Text>
                    <Text
                      style={{
                        fontFamily: Typography.body,
                        fontSize: 13,
                        color: Colors.textLight,
                        marginBottom: 16,
                      }}
                    >
                      Fill out this quick survey to immediately get your 1 leaf
                      back.
                    </Text>

                    <Text
                      style={{
                        fontFamily: Typography.bodySemibold,
                        marginBottom: 8,
                      }}
                    >
                      Did the event actually happen?
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 16,
                      }}
                    >
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          padding: 10,
                          borderRadius: 12,
                          backgroundColor:
                            feedbackAnswer.eventHappened === true
                              ? Colors.primary
                              : "#f0f0f0",
                          alignItems: "center",
                        }}
                        onPress={() =>
                          setFeedbackAnswer({
                            ...feedbackAnswer,
                            eventHappened: true,
                          })
                        }
                      >
                        <Text
                          style={{
                            color:
                              feedbackAnswer.eventHappened === true
                                ? "#fff"
                                : "#666",
                            fontWeight: "bold",
                          }}
                        >
                          Yes
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          padding: 10,
                          borderRadius: 12,
                          backgroundColor:
                            feedbackAnswer.eventHappened === false
                              ? Colors.danger
                              : "#f0f0f0",
                          alignItems: "center",
                        }}
                        onPress={() =>
                          setFeedbackAnswer({
                            ...feedbackAnswer,
                            eventHappened: false,
                          })
                        }
                      >
                        <Text
                          style={{
                            color:
                              feedbackAnswer.eventHappened === false
                                ? "#fff"
                                : "#666",
                            fontWeight: "bold",
                          }}
                        >
                          No
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {feedbackAnswer.eventHappened && (
                      <>
                        <Text
                          style={{
                            fontFamily: Typography.bodySemibold,
                            marginBottom: 8,
                          }}
                        >
                          How would you rate the experience?
                        </Text>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                          {["🌑", "🌒", "🌓", "🌔", "🌕"].map((moon, index) => {
                            const ratingValue = index + 1;
                            const isSelected = feedbackAnswer.rating === ratingValue;
                            return (
                              <TouchableOpacity
                                key={ratingValue}
                                style={{
                                  padding: 10,
                                  borderRadius: 24,
                                  backgroundColor: isSelected ? Colors.primary : "#f0f0f0",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 48,
                                  height: 48
                                }}
                                onPress={() => setFeedbackAnswer({ ...feedbackAnswer, rating: ratingValue })}
                              >
                                <Text style={{ fontSize: 20 }}>{moon}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    )}

                    <TouchableOpacity
                      disabled={
                        feedbackAnswer.eventHappened === undefined ||
                        (feedbackAnswer.eventHappened &&
                          feedbackAnswer.rating === undefined)
                      }
                      style={[
                        styles.btnPrimaryFull,
                        {
                          opacity:
                            feedbackAnswer.eventHappened !== undefined &&
                            (!feedbackAnswer.eventHappened ||
                              feedbackAnswer.rating !== undefined)
                              ? 1
                              : 0.5,
                          marginTop: 0,
                        },
                      ]}
                      onPress={async () => {
                        await submitFeedback(
                          selectedEvent.id,
                          feedbackAnswer.eventHappened!,
                          feedbackAnswer.rating || 0
                        );
                        setFeedbackSubmitted((prev) => ({
                          ...prev,
                          [selectedEvent.id]: true,
                        }));
                        alert("Feedback submitted. 1 leaf refunded!");
                        setSelectedEvent(null);
                        setMode("map");
                      }}
                    >
                      <Text style={styles.btnPrimaryText}>
                        Submit & Claim 1 🍃
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

              {/* Normal Chat Input */}
              {!isPastEvent && !isFinalized && (
                <View style={styles.chatInputRow}>
                  <TextInput
                    style={styles.chatInput}
                    placeholder="Send a scroll..."
                    placeholderTextColor="#bbb"
                  />
                  <TouchableOpacity style={styles.btnPrimary}>
                    <Text style={styles.btnPrimaryText}>Send</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </BlurView>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.glassWrapperBottomFull}>
      <BlurView intensity={90} tint="light" style={styles.glassPanelBottomFull}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 5,
          }}
        >
          <Text style={styles.panelTitle}>Filter Events</Text>
          <TouchableOpacity
            onPress={() => setMode("map")}
            style={{ padding: 5 }}
          >
            <Feather name="x" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <Text
          style={{
            fontFamily: Typography.body,
            color: Colors.textLight,
            marginBottom: 15,
          }}
        >
          Select categories to show on map. Deselect all to view everything.
        </Text>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {EVENT_CATEGORIES.map((cat) => {
            const isCatActive = activeFilters[cat.id] !== undefined;
            const isExpanded = expandedCat === cat.id;
            return (
              <View key={cat.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity
                    style={[
                      styles.filterCard,
                      { flex: 1, marginRight: 10 },
                      isCatActive && [
                        styles.filterCardActive,
                        { backgroundColor: cat.color, borderColor: cat.color },
                      ],
                    ]}
                    onPress={() => toggleCategory(cat.id)}
                  >
                    <Feather
                      name={cat.icon}
                      size={20}
                      color={isCatActive ? "#fff" : cat.color}
                    />
                    <Text
                      style={[
                        styles.filterCardText,
                        isCatActive
                          ? { color: "#fff" }
                          : { color: Colors.text },
                      ]}
                    >
                      {cat.label}{" "}
                      {isCatActive && activeFilters[cat.id].length > 0
                        ? `(${activeFilters[cat.id].length})`
                        : ""}
                    </Text>
                  </TouchableOpacity>
                  {cat.subgroups.length > 0 && (
                    <TouchableOpacity
                      style={{
                        padding: 15,
                        backgroundColor: "rgba(255,255,255,0.5)",
                        borderRadius: 16,
                      }}
                      onPress={() => setExpandedCat(isExpanded ? null : cat.id)}
                    >
                      <Feather
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={Colors.text}
                      />
                    </TouchableOpacity>
                  )}
                </View>
                {isExpanded && cat.subgroups.length > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 10,
                      paddingLeft: 10,
                    }}
                  >
                    {cat.subgroups.map((sub) => {
                      const isSubActive =
                        isCatActive &&
                        (activeFilters[cat.id].length === 0 ||
                          activeFilters[cat.id].includes(sub));
                      return (
                        <TouchableOpacity
                          key={sub}
                          style={[
                            styles.wizardSubCat,
                            isSubActive && {
                              backgroundColor: cat.color,
                              borderColor: cat.color,
                              shadowOpacity: 0.2,
                            },
                          ]}
                          onPress={() => toggleSubFilter(cat.id, sub)}
                        >
                          <Text
                            style={[
                              styles.wizardSubCatText,
                              isSubActive && { color: "#fff" },
                            ]}
                          >
                            {sub}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                style={[
                  styles.filterCard,
                  { flex: 1, marginRight: 10 },
                  activeAgeFilters.length > 0 && [
                    styles.filterCardActive,
                    { backgroundColor: "#00BCD4", borderColor: "#00BCD4" },
                  ],
                ]}
                onPress={() => {
                  if (activeAgeFilters.length > 0) setActiveAgeFilters([]);
                  else setExpandedAge(!expandedAge);
                }}
              >
                <Feather
                  name="users"
                  size={20}
                  color={activeAgeFilters.length > 0 ? "#fff" : "#00BCD4"}
                />
                <Text
                  style={[
                    styles.filterCardText,
                    activeAgeFilters.length > 0
                      ? { color: "#fff" }
                      : { color: Colors.text },
                  ]}
                >
                  Age Group{" "}
                  {activeAgeFilters.length > 0
                    ? `(${activeAgeFilters.length})`
                    : ""}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  padding: 15,
                  backgroundColor: "rgba(255,255,255,0.5)",
                  borderRadius: 16,
                }}
                onPress={() => setExpandedAge(!expandedAge)}
              >
                <Feather
                  name={expandedAge ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={Colors.text}
                />
              </TouchableOpacity>
            </View>
            {expandedAge && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 10,
                  paddingLeft: 10,
                }}
              >
                {["All Ages", "Under 18", "18-25", "26-35", "36-45", "45+"].map(
                  (age) => {
                    const isSubActive = activeAgeFilters.includes(age);
                    return (
                      <TouchableOpacity
                        key={age}
                        style={[
                          styles.wizardSubCat,
                          isSubActive && {
                            backgroundColor: "#00BCD4",
                            borderColor: "#00BCD4",
                          },
                        ]}
                        onPress={() => {
                          if (isSubActive)
                            setActiveAgeFilters(
                              activeAgeFilters.filter((a) => a !== age),
                            );
                          else setActiveAgeFilters([...activeAgeFilters, age]);
                        }}
                      >
                        <Text
                          style={[
                            styles.wizardSubCatText,
                            isSubActive && { color: "#fff" },
                          ]}
                        >
                          {age}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>
            )}
          </View>

          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                style={[
                  styles.filterCard,
                  { flex: 1, marginRight: 10 },
                  activeGenderFilters.length > 0 && [
                    styles.filterCardActive,
                    { backgroundColor: "#FF9800", borderColor: "#FF9800" },
                  ],
                ]}
                onPress={() => {
                  if (activeGenderFilters.length > 0)
                    setActiveGenderFilters([]);
                  else setExpandedGender(!expandedGender);
                }}
              >
                <Feather
                  name="heart"
                  size={20}
                  color={activeGenderFilters.length > 0 ? "#fff" : "#FF9800"}
                />
                <Text
                  style={[
                    styles.filterCardText,
                    activeGenderFilters.length > 0
                      ? { color: "#fff" }
                      : { color: Colors.text },
                  ]}
                >
                  Target Gender{" "}
                  {activeGenderFilters.length > 0
                    ? `(${activeGenderFilters.length})`
                    : ""}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  padding: 15,
                  backgroundColor: "rgba(255,255,255,0.5)",
                  borderRadius: 16,
                }}
                onPress={() => setExpandedGender(!expandedGender)}
              >
                <Feather
                  name={expandedGender ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={Colors.text}
                />
              </TouchableOpacity>
            </View>
            {expandedGender && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 10,
                  paddingLeft: 10,
                }}
              >
                {["Anyone", "Male", "Female", "LGBTQIA+"].map((gender) => {
                  const isSubActive = activeGenderFilters.includes(gender);
                  return (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.wizardSubCat,
                        isSubActive && {
                          backgroundColor: "#FF9800",
                          borderColor: "#FF9800",
                        },
                      ]}
                      onPress={() => {
                        if (isSubActive)
                          setActiveGenderFilters(
                            activeGenderFilters.filter((a) => a !== gender),
                          );
                        else
                          setActiveGenderFilters([
                            ...activeGenderFilters,
                            gender,
                          ]);
                      }}
                    >
                      <Text
                        style={[
                          styles.wizardSubCatText,
                          isSubActive && { color: "#fff" },
                        ]}
                      >
                        {gender}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </BlurView>
    </View>
  );

  const renderCreateTribeWizard = () => {
    return (
      <View style={styles.glassWrapperBottomFull}>
        <BlurView
          intensity={95}
          tint="light"
          style={styles.glassPanelBottomFull}
        >
          {wizardStep === 1 && (
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontFamily: Typography.heading,
                    fontSize: 24,
                    color: Colors.text,
                    flex: 1,
                  }}
                >
                  Form a Tribe
                </Text>
                <TouchableOpacity onPress={() => setMode("map")}>
                  <Feather name="x" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <Text
                style={{
                  fontFamily: Typography.body,
                  color: Colors.textLight,
                  marginBottom: 20,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                You successfully hosted an event! Now you have the right to form
                a permanent Tribe with the attendees.
              </Text>

              <Text
                style={{
                  fontFamily: Typography.bodyBold,
                  fontSize: 13,
                  color: Colors.text,
                  marginBottom: 6,
                }}
              >
                Tribe Name
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Weekend Warriors"
                value={wizardDraft.name}
                onChangeText={(t) =>
                  setWizardDraft({ ...wizardDraft, name: t })
                }
              />

              <Text
                style={{
                  fontFamily: Typography.bodyBold,
                  fontSize: 13,
                  color: Colors.text,
                  marginBottom: 6,
                }}
              >
                Description
              </Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                multiline
                placeholder="What is this tribe about?"
                value={wizardDraft.description}
                onChangeText={(t) =>
                  setWizardDraft({ ...wizardDraft, description: t })
                }
              />

              <Text
                style={{
                  fontFamily: Typography.bodyBold,
                  fontSize: 13,
                  color: Colors.text,
                  marginBottom: 6,
                }}
              >
                Main Interest Category
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}
              >
                {EVENT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() =>
                      setWizardDraft({ ...wizardDraft, categoryId: cat.id, categorySub: [] })
                    }
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      marginRight: 8,
                      backgroundColor:
                        wizardDraft.categoryId === cat.id
                          ? cat.color
                          : "rgba(255,255,255,0.7)",
                      borderWidth: 1,
                      borderColor:
                        wizardDraft.categoryId === cat.id ? cat.color : "#ccc",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          wizardDraft.categoryId === cat.id ? "#fff" : "#666",
                        fontWeight: "bold",
                        fontSize: 13,
                      }}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {wizardDraft.categoryId && (EVENT_CATEGORIES.find(c => c.id === wizardDraft.categoryId)?.subgroups || []).length > 0 && (
                <>
                  <Text style={{ fontFamily: Typography.bodyBold, fontSize: 13, color: Colors.text, marginBottom: 6 }}>
                    Specific Interests (Optional)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                    {EVENT_CATEGORIES.find(c => c.id === wizardDraft.categoryId)?.subgroups.map(sub => (
                      <TouchableOpacity
                        key={sub}
                        onPress={() => {
                          const subs = wizardDraft.categorySub || [];
                          if (subs.includes(sub)) {
                              setWizardDraft({...wizardDraft, categorySub: subs.filter(s => s !== sub)});
                          } else {
                              setWizardDraft({...wizardDraft, categorySub: [...subs, sub]});
                          }
                        }}
                        style={[
                          styles.wizardSubCat,
                          wizardDraft.categorySub?.includes(sub) && styles.wizardSubCatActive
                        ]}
                      >
                        <Text style={wizardDraft.categorySub?.includes(sub) ? styles.wizardSubCatText : { fontFamily: Typography.bodySemibold, fontSize: 13, color: Colors.textLight } }>{sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <TouchableOpacity
                disabled={!wizardDraft.name || !wizardDraft.categoryId}
                style={[
                  styles.btnPrimaryFull,
                  {
                    opacity:
                      wizardDraft.name && wizardDraft.categoryId ? 1 : 0.5,
                  },
                ]}
                onPress={() => setWizardStep(2)}
              >
                <Text style={styles.btnPrimaryText}>Next: Choose a Spirit</Text>
              </TouchableOpacity>
            </View>
          )}

          {wizardStep === 2 && (
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <TouchableOpacity
                  onPress={() => setWizardStep(1)}
                  style={{ padding: 5, marginRight: 8 }}
                >
                  <Feather name="arrow-left" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text
                  style={{
                    fontFamily: Typography.heading,
                    fontSize: 24,
                    color: Colors.text,
                    flex: 1,
                  }}
                >
                  Choose a Spirit
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: Typography.body,
                  color: Colors.textLight,
                  marginBottom: 20,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                The spirit acts as an emblem for your tribe. It will represent
                your group on the map.
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 12,
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                {Object.keys(SPIRIT_ASSETS).map((key) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() =>
                      setWizardDraft({ ...wizardDraft, spiritId: key })
                    }
                    style={{
                      width: "30%",
                      aspectRatio: 1,
                      backgroundColor:
                        wizardDraft.spiritId === key
                          ? "rgba(140,179,105,0.2)"
                          : "rgba(255,255,255,0.6)",
                      borderRadius: 20,
                      borderWidth: 2,
                      borderColor:
                        wizardDraft.spiritId === key
                          ? Colors.primary
                          : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 10,
                    }}
                  >
                    <Image
                      source={SPIRIT_ASSETS[key]}
                      style={{
                        width: "80%",
                        height: "80%",
                        resizeMode: "contain",
                        marginBottom: 4,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: Typography.bodyBold,
                        color: Colors.text,
                      }}
                    >
                      {SPIRIT_LABELS[key]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.btnPrimaryFull}
                onPress={() => setWizardStep(3)}
              >
                <Text style={styles.btnPrimaryText}>
                  Next: Privacy & Review
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {wizardStep === 3 && (
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <TouchableOpacity
                  onPress={() => setWizardStep(2)}
                  style={{ padding: 5, marginRight: 8 }}
                >
                  <Feather name="arrow-left" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text
                  style={{
                    fontFamily: Typography.heading,
                    fontSize: 24,
                    color: Colors.text,
                    flex: 1,
                  }}
                >
                  Final Step
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.7)",
                  padding: 20,
                  borderRadius: 20,
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontFamily: Typography.bodyBold,
                    fontSize: 16,
                    marginBottom: 10,
                  }}
                >
                  Privacy Settings
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setWizardDraft({ ...wizardDraft, isPrivateTribe: false })
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                    padding: 10,
                    borderRadius: 12,
                    backgroundColor: !wizardDraft.isPrivateTribe
                      ? "rgba(140,179,105,0.1)"
                      : "transparent",
                    borderWidth: 1,
                    borderColor: !wizardDraft.isPrivateTribe
                      ? Colors.primary
                      : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: Colors.primary,
                      marginRight: 10,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {!wizardDraft.isPrivateTribe && (
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: Colors.primary,
                        }}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: Typography.bodyBold,
                        color: Colors.text,
                      }}
                    >
                      Public Tribe
                    </Text>
                    <Text
                      style={{
                        fontFamily: Typography.body,
                        fontSize: 12,
                        color: Colors.textLight,
                      }}
                    >
                      Anyone can see your events tagged with this tribe.
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setWizardDraft({ ...wizardDraft, isPrivateTribe: true })
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 10,
                    borderRadius: 12,
                    backgroundColor: wizardDraft.isPrivateTribe
                      ? "rgba(140,179,105,0.1)"
                      : "transparent",
                    borderWidth: 1,
                    borderColor: wizardDraft.isPrivateTribe
                      ? Colors.primary
                      : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: Colors.primary,
                      marginRight: 10,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {wizardDraft.isPrivateTribe && (
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: Colors.primary,
                        }}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: Typography.bodyBold,
                        color: Colors.text,
                      }}
                    >
                      Private Tribe
                    </Text>
                    <Text
                      style={{
                        fontFamily: Typography.body,
                        fontSize: 12,
                        color: Colors.textLight,
                      }}
                    >
                      Your tribe name and badge will be hidden from public
                      events. Invitation only.
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <Text
                  style={{
                    fontFamily: Typography.body,
                    color: Colors.textLight,
                    textAlign: "center",
                  }}
                >
                  By planting this seed, you invite the attendees of your last
                  event to join your new tribe immediately.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.btnPrimaryFull}
                onPress={async () => {
                  await createTribe(
                    wizardDraft.name,
                    wizardDraft.description,
                    wizardDraft.categoryId,
                    wizardDraft.spiritId,
                    wizardDraft.isPrivateTribe,
                    wizardDraft.fromAttendees,
                    wizardDraft.categorySub
                  );
                  alert("Tribe has been planted! Welcome, Chief.");
                  setMode("map");
                  setWizardStep(0);
                  setWizardDraft({
                    name: "",
                    description: "",
                    spiritId: "forest",
                    isPrivateTribe: false,
                    categoryId: "",
                    categorySub: [],
                    fromEventId: "",
                    fromAttendees: [],
                  });
                }}
              >
                <Text style={styles.btnPrimaryText}>Plant the Seed 🔥</Text>
              </TouchableOpacity>
            </View>
          )}
        </BlurView>
      </View>
    );
  };

  const renderTutorial = () => {
    switch (tutStep) {
      case 0:
        return (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: "rgba(0,0,0,0.7)",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: Typography.heading,
                color: "#fff",
                fontSize: 28,
                marginBottom: 15,
              }}
            >
              Welcome to The Tribes
            </Text>
            <Text
              style={{
                fontFamily: Typography.body,
                color: "#fff",
                fontSize: 16,
                textAlign: "center",
                paddingHorizontal: 30,
                marginBottom: 30,
                lineHeight: 24,
              }}
            >
              Discover local events, meet new people, and assemble your tribe.
              Let's take a quick tour!
            </Text>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => setTutStep(1)}
            >
              <Text style={styles.btnPrimaryText}>Start Tour</Text>
            </TouchableOpacity>
          </View>
        );
      case 1:
        return (
          <View
            style={[
              StyleSheet.absoluteFill,
              { pointerEvents: "box-none", zIndex: 9999 },
            ]}
          >
            <View
              style={{
                position: "absolute",
                top: 100,
                left: 20,
                backgroundColor: "#fff",
                padding: 20,
                borderRadius: 20,
                width: 260,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 15,
              }}
              pointerEvents="auto"
            >
              <Feather
                name="arrow-up"
                size={30}
                color={Colors.primary}
                style={{ position: "absolute", top: -25, left: 25 }}
              />
              <Text
                style={{
                  fontFamily: Typography.bodySemibold,
                  marginBottom: 10,
                }}
              >
                1. Your Leaves
              </Text>
              <Text
                style={{
                  fontFamily: Typography.body,
                  color: "#666",
                  marginBottom: 15,
                }}
              >
                Leaves are your currency. Use them to join and create events.
                You get 5 free every day!
              </Text>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { alignSelf: "flex-end", paddingVertical: 10 },
                ]}
                onPress={() => setTutStep(2)}
              >
                <Text style={styles.btnPrimaryText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 2:
        return (
          <View
            style={[
              StyleSheet.absoluteFill,
              { pointerEvents: "box-none", zIndex: 9999 },
            ]}
          >
            <View
              style={{
                position: "absolute",
                top: 105,
                right: 20,
                backgroundColor: "#fff",
                padding: 20,
                borderRadius: 20,
                width: 260,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 15,
              }}
              pointerEvents="auto"
            >
              <Feather
                name="arrow-up"
                size={30}
                color={Colors.primary}
                style={{ position: "absolute", top: -25, right: 5 }}
              />
              <Text
                style={{
                  fontFamily: Typography.bodySemibold,
                  marginBottom: 10,
                }}
              >
                2. Settings
              </Text>
              <Text
                style={{
                  fontFamily: Typography.body,
                  color: "#666",
                  marginBottom: 15,
                }}
              >
                Tap here to update your profile, tags, and adjust app
                preferences.
              </Text>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { alignSelf: "flex-end", paddingVertical: 10 },
                ]}
                onPress={() => setTutStep(3)}
              >
                <Text style={styles.btnPrimaryText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 3:
        return (
          <View
            style={[
              StyleSheet.absoluteFill,
              { pointerEvents: "box-none", zIndex: 9999 },
            ]}
          >
            <View
              style={{
                position: "absolute",
                top: 165,
                right: 20,
                backgroundColor: "#fff",
                padding: 20,
                borderRadius: 20,
                width: 260,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 15,
              }}
              pointerEvents="auto"
            >
              <Feather
                name="arrow-up"
                size={30}
                color={Colors.primary}
                style={{ position: "absolute", top: -25, right: 5 }}
              />
              <Text
                style={{
                  fontFamily: Typography.bodySemibold,
                  marginBottom: 10,
                }}
              >
                3. Global Navigation
              </Text>
              <Text
                style={{
                  fontFamily: Typography.body,
                  color: "#666",
                  marginBottom: 15,
                }}
              >
                Center the map to your home or search to instantly fly to any
                location worldwide.
              </Text>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { alignSelf: "flex-end", paddingVertical: 10 },
                ]}
                onPress={() => setTutStep(4)}
              >
                <Text style={styles.btnPrimaryText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 4:
        return (
          <View
            style={[
              StyleSheet.absoluteFill,
              { pointerEvents: "box-none", zIndex: 9999 },
            ]}
          >
            <View
              style={{
                position: "absolute",
                bottom: 110,
                right: 20,
                backgroundColor: "#fff",
                padding: 20,
                borderRadius: 20,
                width: 260,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 15,
              }}
              pointerEvents="auto"
            >
              <Feather
                name="arrow-down"
                size={30}
                color={Colors.primary}
                style={{ position: "absolute", bottom: -25, right: 10 }}
              />
              <Text
                style={{
                  fontFamily: Typography.bodySemibold,
                  marginBottom: 10,
                }}
              >
                4. Find Your Vibe
              </Text>
              <Text
                style={{
                  fontFamily: Typography.body,
                  color: "#666",
                  marginBottom: 15,
                }}
              >
                Use filters to discover specific events based on category, age,
                or gender.
              </Text>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { alignSelf: "flex-end", paddingVertical: 10 },
                ]}
                onPress={() => setTutStep(5)}
              >
                <Text style={styles.btnPrimaryText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 5:
        return (
          <View
            style={{
              position: "absolute",
              top: 180,
              left: 20,
              backgroundColor: "#fff",
              padding: 20,
              borderRadius: 20,
              width: 260,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 15,
              zIndex: 9999,
            }}
          >
            <Feather
              name="arrow-up"
              size={30}
              color={Colors.primary}
              style={{ position: "absolute", top: -25, left: 14 }}
            />
            <Text
              style={{ fontFamily: Typography.bodySemibold, marginBottom: 10 }}
            >
              5. Create an Event
            </Text>
            <Text
              style={{
                fontFamily: Typography.body,
                color: "#666",
                marginBottom: 15,
              }}
            >
              Ready to host? Tap the + icon to assemble a tribe right at the
              map's center crosshair!
            </Text>
            <TouchableOpacity
              style={[
                styles.btnPrimary,
                { alignSelf: "flex-end", paddingVertical: 10 },
              ]}
              onPress={() => setTutStep(6)}
            >
              <Text style={styles.btnPrimaryText}>Next</Text>
            </TouchableOpacity>
          </View>
        );
      case 6:
        return (
          <View
            style={{
              position: "absolute",
              top: 100,
              left: "50%",
              transform: [{ translateX: -150 }],
              backgroundColor: "#fff",
              padding: 20,
              borderRadius: 20,
              width: 300,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 15,
              zIndex: 9999,
            }}
          >
            <Text
              style={{ fontFamily: Typography.bodySemibold, marginBottom: 10 }}
            >
              6. Tribal Fires
            </Text>
            <Text
              style={{
                fontFamily: Typography.body,
                color: "#666",
                marginBottom: 10,
              }}
            >
              Active events show up as pins. Let's practice! Tap the test pin
              exactly at the center of the map.
            </Text>
            <TouchableOpacity
              onPress={() => markTutorialSeen()}
              style={{
                alignSelf: "center",
                paddingVertical: 5,
                marginBottom: 5,
              }}
            >
              <Text
                style={{
                  color: Colors.textLight,
                  fontFamily: Typography.bodyBold,
                }}
              >
                Skip Tutorial
              </Text>
            </TouchableOpacity>
            <Feather
              name="arrow-down"
              size={30}
              color={Colors.primary}
              style={{ alignSelf: "center", position: "absolute", bottom: -30 }}
            />
          </View>
        );
      case 7:
        return (
          <View
            style={{
              position: "absolute",
              top: 120,
              left: "50%",
              transform: [{ translateX: -150 }],
              backgroundColor: "#fff",
              padding: 20,
              borderRadius: 20,
              width: 300,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 15,
              zIndex: 9999,
            }}
            pointerEvents="none"
          >
            <Text
              style={{ fontFamily: Typography.bodySemibold, marginBottom: 10 }}
            >
              7. Joining a Tribe
            </Text>
            <Text
              style={{
                fontFamily: Typography.body,
                color: "#666",
                marginBottom: 15,
              }}
            >
              This is a locked Tribal Chat. It stays secure until you commit 1
              Leaf to join the event. Go ahead, tap the "Join Tribe" button
              below!
            </Text>
            <Feather
              name="arrow-down"
              size={30}
              color={Colors.primary}
              style={{ alignSelf: "center", marginTop: 10 }}
            />
          </View>
        );
      default:
        return null;
    }
  };

  // Bonfire intensity: 0 = distant (>24h), 1 = happening NOW
  const getBonfireIntensity = (eventTime: any): number => {
    if (!eventTime) return 0.3;
    const now = Date.now();
    const t = new Date(eventTime).getTime();
    const hoursUntil = (t - now) / (1000 * 60 * 60);
    if (hoursUntil < 0) return 1;
    if (hoursUntil >= 24) return 0.15;
    return 1 - hoursUntil / 24;
  };

  const getBonfireStyle = (intensity: number) => {
    const glowRadius = 2 + intensity * 10;
    const glowOpacity = 0.3 + intensity * 0.5;
    const g = Math.round(200 - intensity * 130);
    return {
      justifyContent: "center" as const,
      alignItems: "center" as const,
      backgroundColor: "transparent",
      shadowColor: `rgb(255, ${Math.round(g * 0.5)}, 0)`,
      shadowOpacity: glowOpacity,
      shadowRadius: glowRadius,
      shadowOffset: { width: 0, height: 0 },
      elevation: Math.round(2 + intensity * 8),
    };
  };

  const renderProfileModal = () => {
    if (!profileViewUid) return null;
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", zIndex: 9999 }]}>
        <BlurView intensity={90} tint="light" style={{ width: 320, padding: 24, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center" }}>
          <TouchableOpacity style={{ position: "absolute", top: 15, right: 15, zIndex: 10000 }} onPress={() => { setProfileViewUid(null); setProfileViewData(null); }}>
            <Feather name="x" size={24} color={Colors.text} />
          </TouchableOpacity>
          {profileViewData ? (
            <>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ fontSize: 32, fontFamily: Typography.heading, color: "#fff" }}>{String(profileViewData.displayName || "?").charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={{ fontFamily: Typography.heading, fontSize: 22, color: Colors.text, marginBottom: 16 }}>{String(profileViewData.displayName || "Unknown")}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" }}>
                {profileViewData.dateOfBirth && !isNaN(new Date(String(profileViewData.dateOfBirth)).getTime()) ? (
                  <View style={{ backgroundColor: "rgba(255,255,255,0.6)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: "#ddd" }}>
                    <Text style={{ fontFamily: Typography.bodyBold, fontSize: 12, color: Colors.text }}>⏳ {Math.floor((Date.now() - new Date(String(profileViewData.dateOfBirth)).getTime()) / 31557600000)}</Text>
                  </View>
                ) : null}
                {profileViewData.sex ? (
                  <View style={{ backgroundColor: "rgba(255,255,255,0.6)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: "#ddd" }}>
                    <Text style={{ fontFamily: Typography.bodyBold, fontSize: 12, color: Colors.text }}>{profileViewData.sex === "Male" ? "‍♂️" : profileViewData.sex === "Female" ? "‍♀️" : "👤"} {String(profileViewData.sex)}</Text>
                  </View>
                ) : null}
              </View>
              {profileViewData.description ? (
                <Text style={{ fontFamily: Typography.body, fontSize: 14, color: Colors.text, textAlign: "center", marginBottom: 20 }}>
                  "{String(profileViewData.description)}"
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 20, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", paddingTop: 16, width: "100%", justifyContent: "center", alignItems: "center" }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 13, fontFamily: Typography.bodySemibold, color: Colors.text }}>Host Rating</Text>
                  <Text style={{ fontSize: 20, marginTop: 4 }}>
                    {renderMoons(profileViewData.ratingSum || 0, profileViewData.ratingCount || 0)}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <ActivityIndicator color={Colors.primary} size="large" style={{ marginVertical: 40 }} />
          )}
        </BlurView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: user?.homeLocation?.longitude || 19.0238,
          latitude: user?.homeLocation?.latitude || 50.2649,
          zoom: 12.5,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={process.env.EXPO_PUBLIC_MAPBOX_KEY}
        onClick={handleMapClick}
        onZoom={(e: any) => setCurrentZoom(e.viewState.zoom)}
      >
        {clusteredMarkers.map((cluster, ci) => {
          // Hottest event in cluster determines bonfire intensity
          const maxIntensity = Math.max(
            ...cluster.events.map((e) => getBonfireIntensity(e.time)),
          );
          const isSingle = cluster.events.length === 1;
          const iconSize = isSingle
            ? 28 + maxIntensity * 12
            : 36 + maxIntensity * 10;
          return (
            <Marker
              key={`c-${ci}`}
              longitude={cluster.lng}
              latitude={cluster.lat}
              anchor="center"
              onClick={(e: any) => {
                e.originalEvent?.stopPropagation();
                if (isSingle) {
                  const ev = cluster.events[0];
                  if (mode === "map" || tutStep === 6) {
                    setSelectedEvent(ev as any);
                    setMode("event_chat");
                    setSelectedCluster(null);
                    if (tutStep === 6 && ev.id === "tutorial-dummy")
                      setTutStep(7);
                  }
                } else {
                  setSelectedCluster(
                    selectedCluster?.lat === cluster.lat ? null : cluster,
                  );
                }
              }}
            >
              <div style={{ position: "relative", cursor: "pointer" }}>
                <img
                  src={require("../assets/bonfire.png")}
                  style={{
                    width: iconSize,
                    height: iconSize,
                    objectFit: "contain",
                    display: "block",
                    filter: `drop-shadow(0 0 ${Math.round(4 + maxIntensity * 14)}px rgba(255, ${Math.round(160 - maxIntensity * 120)}, 0, ${0.3 + maxIntensity * 0.7}))`,
                  }}
                />
                {!isSingle && (
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -8,
                      backgroundColor: "#FF5722",
                      color: "#fff",
                      borderRadius: 10,
                      minWidth: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      border: "2px solid #fff",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                      paddingInline: 4,
                    }}
                  >
                    {cluster.events.length}
                  </div>
                )}
              </div>
            </Marker>
          );
        })}

        {/* Cluster popup */}
        {selectedCluster && (
          <Marker
            longitude={selectedCluster.lng}
            latitude={selectedCluster.lat}
            anchor="top"
            offset={[0, 8]}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(12px)",
                borderRadius: 14,
                padding: 8,
                minWidth: 200,
                maxWidth: 260,
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              {selectedCluster.events.map((ev, i) => {
                const cat = EVENT_CATEGORIES.find(
                  (c) => c.id === ev.categoryId,
                );
                const timeStr = ev.time
                  ? format(new Date(ev.time), "MMM d, HH:mm")
                  : "";
                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setSelectedEvent(ev as any);
                      setMode("event_chat");
                      setSelectedCluster(null);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 8px",
                      cursor: "pointer",
                      borderRadius: 10,
                      borderBottom:
                        i < selectedCluster.events.length - 1
                          ? "1px solid rgba(0,0,0,0.05)"
                          : "none",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(0,0,0,0.04)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: cat?.color || "#999",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ev.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#888" }}>
                        {timeStr}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Marker>
        )}
        {mode === "wizard_location" && draft.location && (
          <Marker
            longitude={draft.location.lng}
            latitude={draft.location.lat}
            anchor="center"
          >
            <View style={[styles.pinBase, styles.pinDraft]} />
          </Marker>
        )}
      </Map>

      {renderHUD()}
      {renderDevTools()}
      {mode === "wizard_details" && renderWizardDetails()}
      {mode === "wizard_location" && renderWizardLocation()}
      {mode === "event_chat" && renderEventChat()}
      {mode === "filters" && renderFilters()}
      {mode === "tribe_panel" && renderTribePanel()}
      {mode === "create_tribe_wizard" && renderCreateTribeWizard()}
      {renderMapSearch()}
      {renderTutorial()}
      {renderProfileModal()}
    </View>
  );
}

// ---------------- STYLES ---------------- //
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  settingsBtn: { position: "absolute", top: 35, right: 20 },
  locateBtn: { position: "absolute", top: 95, right: 20 },
  iconWrapper: {
    padding: 12,
    borderRadius: 25,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  inlineIcon: {
    width: 17,
    height: 17,
    resizeMode: "contain",
    marginHorizontal: 2,
    transform: [{ translateY: 3 }],
  },

  devPanel: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -100 }],
    backgroundColor: "rgba(200, 50, 50, 0.85)",
    padding: 12,
    borderRadius: 12,
    zIndex: 1000,
    elevation: 1000,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  devTitle: {
    fontFamily: Typography.heading,
    color: "#fff",
    fontSize: 10,
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: 1,
  },
  devBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 5,
    elevation: 2,
  },
  devBtnText: {
    fontFamily: Typography.bodyBold,
    color: "rgba(200, 50, 50, 1)",
    fontSize: 9,
    textAlign: "center",
  },

  topLeft: { position: "absolute", top: 35, left: 20 },
  balancePill: {
    overflow: "hidden",
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  balanceText: {
    fontFamily: Typography.bodyBold,
    color: Colors.primaryDark,
    fontSize: 13,
    textAlign: "center",
  },

  upcomingRow: { flexDirection: "row", alignItems: "center" },
  plusBtn: {
    width: 54,
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  upcomingScroll: { marginLeft: 12, maxWidth: 220 },
  upcomingIcon: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  upcomingInitial: {
    fontFamily: Typography.bodyBold,
    color: Colors.text,
    fontSize: 15,
  },

  bottomBar: {
    position: "absolute",
    bottom: 35,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  dateSliderContainer: {
    flex: 1,
    marginRight: 15,
    borderRadius: 24,
    paddingVertical: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    flexDirection: "row",
    alignItems: "center",
  },
  scrollIndicatorLeft: {
    position: "absolute",
    left: 4,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  scrollIndicatorRight: {
    position: "absolute",
    right: 4,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  datePill: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    marginRight: 6,
  },
  datePillActive: {
    backgroundColor: "rgba(255,255,255,0.95)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  datePillText: {
    fontFamily: Typography.bodySemibold,
    color: Colors.textLight,
    fontSize: 13,
  },
  datePillTextActive: { color: Colors.text },

  filterBtn: { borderRadius: 24, overflow: "hidden" },
  filterBtnWrapper: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  filterBtnText: {
    fontFamily: Typography.bodyBold,
    color: Colors.text,
    fontSize: 13,
  },

  wizardCat: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 8,
    backgroundColor: "#fff",
  },
  wizardCatText: {
    fontFamily: Typography.bodyBold,
    fontSize: 13,
    color: Colors.text,
    marginLeft: 6,
  },
  wizardSubCat: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginRight: 8,
  },
  wizardSubCatActive: {
    backgroundColor: "rgba(255,255,255,0.95)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  wizardSubCatText: {
    fontFamily: Typography.bodySemibold,
    fontSize: 13,
    color: Colors.primaryDark,
  },

  filterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 15,
  },
  filterCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "rgba(255,255,255,0.8)",
    width: "48%",
  },
  filterCardActive: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  filterCardText: {
    fontFamily: Typography.bodyBold,
    fontSize: 14,
    marginLeft: 8,
  },

  glassWrapperBottom: {
    position: "absolute",
    bottom: 35,
    left: 20,
    right: 20,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 25,
  },
  glassWrapperBottomFull: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 30,
    zIndex: 100,
    elevation: 100,
  },
  glassWrapperTop: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    zIndex: 100,
    elevation: 100,
  },

  glassPanelBottom: {
    padding: 25,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  glassPanelBottomFull: {
    padding: 30,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    flex: 1,
  },
  glassPanelTop: { padding: 25, backgroundColor: "rgba(44, 58, 41, 0.7)" },

  panelTitle: {
    fontFamily: Typography.heading,
    fontSize: 26,
    color: Colors.text,
    marginBottom: 20,
  },
  panelTitleDark: {
    fontFamily: Typography.heading,
    fontSize: 22,
    color: "#fff",
    marginBottom: 5,
  },
  panelSubDark: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 20,
  },
  input: {
    fontFamily: Typography.body,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    fontSize: 15,
    color: Colors.text,
  },
  suggestionsContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    maxHeight: 120,
    overflow: "hidden",
    marginTop: -5,
    marginBottom: 15,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  suggestionText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.text,
  },

  row: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
  },
  btnPrimaryFull: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    width: "100%",
    marginTop: 20,
  },
  btnPrimaryText: {
    fontFamily: Typography.bodyBold,
    color: "#fff",
    fontSize: 15,
  },
  btnSecondary: {
    backgroundColor: "transparent",
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  btnSecondaryText: {
    fontFamily: Typography.bodyBold,
    color: "#999",
    fontSize: 15,
  },
  btnSecondaryTextDark: {
    fontFamily: Typography.bodyBold,
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
  },

  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  chatTitle: {
    fontFamily: Typography.heading,
    fontSize: 22,
    color: Colors.text,
  },
  chatSub: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
  },
  closeIcon: { fontSize: 20, color: "#aaa", paddingHorizontal: 5 },
  chatLoc: {
    fontFamily: Typography.bodySemibold,
    fontSize: 13,
    color: Colors.textLight,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    marginBottom: 15,
  },

  chatLocked: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  chatLockedIco: { fontSize: 45, marginBottom: 15 },
  chatLockedTitle: {
    fontFamily: Typography.heading,
    fontSize: 24,
    color: Colors.text,
    marginBottom: 10,
    textAlign: "center",
  },
  chatLockedSub: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.textLight,
    textAlign: "center",
    lineHeight: 22,
  },

  chatOpen: { flex: 1 },
  chatScroll: { flex: 1 },
  chatBubble: {
    backgroundColor: "#F3F4F2",
    padding: 18,
    borderRadius: 20,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 5,
  },
  chatText: { fontFamily: Typography.body, color: Colors.text, fontSize: 14 },
  chatInputRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  chatInput: {
    flex: 1,
    fontFamily: Typography.body,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#eee",
  },

  pinBase: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  pinPublic: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.accent,
  },
  pinPrivate: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(94, 113, 83, 0.25)",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  pinDraft: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    elevation: 10,
    borderWidth: 3,
    borderColor: "#fff",
  },
  pinExternal: { backgroundColor: "#8B9C82" },
});
