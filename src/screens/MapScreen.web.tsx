import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
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
import { EventChat } from '../components/EventChat';
import { TribePanel } from '../components/TribePanel';
import { CreateTribeWizard } from '../components/CreateTribeWizard';
import { ProfileModal } from '../components/ProfileModal';
import { styles } from '../components/MapStyles';
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
import { SPIRIT_ASSETS, SPIRIT_LABELS, renderMoons } from "../utils/assets";
import { notify, confirmDialog } from "../utils/dialogs";
import { getMapStyleUrl } from "../utils/mapStyle";
import { useI18n } from "../i18n";

import Map, { Marker, Layer, Source, MapMouseEvent } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_KEY as string;
mapboxgl.accessToken = MAPBOX_TOKEN;

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
  const { t, tn, tValue, dateLocale } = useI18n();

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
  const [participantNamesCache, setParticipantNamesCache] = useState<Record<string, string>>({});
  const [hasProcessedEventInvite, setHasProcessedEventInvite] = useState(false);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollRef = React.useRef<ScrollView>(null);
  const mapRef = React.useRef<any>(null);
  const [scrollX, setScrollX] = useState(0);
  const [currentZoom, setCurrentZoom] = useState(12.5);

  // Day = stock Mapbox style, night = the app's custom forest style.
  // Re-checked periodically so a long-lived session crosses the boundary.
  const [mapStyleUrl, setMapStyleUrl] = useState(getMapStyleUrl);
  React.useEffect(() => {
    const id = setInterval(() => setMapStyleUrl(getMapStyleUrl()), 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

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
    title: "Sunset Hike",
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

  let displayFilterEvents = events.filter((e) => {
    if (e.status === "cancelled" || e.status === "finalized") return false;
    // Private events only visible to participants
    if (e.isPrivate && !e.participants?.includes(user?.uid || "")) return false;
    // Hide events where user already submitted feedback
    if (feedbackSubmitted[e.id]) return false;
    return true;
  });
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

  displayFilterEvents = displayFilterEvents.filter((e) => {
    if (!e.time) return false;
    const t = new Date(e.time);
    if (dateFilter === "All") return t >= todayStart;                    // all future, no upper bound
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
  let displayEvents = displayFilterEvents;
  if (tutStep >= 6 && tutStep <= 7)
    displayEvents = [...displayEvents, dummyEvent];
  const joinedEvents = events.filter((e) => {
    if (!e.participants?.includes(user?.uid || "")) return false;
    if (e.status === "cancelled") return false;
    if (e.status === "finalized") {
      // Finalized events stay in the bar only while the participant still
      // has a leaf to claim; once feedback exists they disappear for good.
      const isHost = e.creatorId === user?.uid;
      if (isHost) return false;
      if (feedbackSubmitted[e.id]) return false;
      const persisted = userFeedbackCache[e.id];
      if (persisted && persisted !== "none") return false;
      return true;
    }
    return true;
  });
  const userTribes = tribes.filter((t) => t.members.includes(user?.uid || ""));

  // Firestore snapshots replace array contents, but selected* state still holds
  // the object captured at tap time — resolve to the live document so panels
  // react to joins, applications, and announcements without reopening.
  const liveSelectedEvent = selectedEvent
    ? events.find((e) => e.id === selectedEvent.id) ?? selectedEvent
    : null;
  const liveSelectedTribe = selectedTribe
    ? tribes.find((t) => t.id === selectedTribe.id) ?? selectedTribe
    : null;

  const hasNarrowingFilters =
    dateFilter !== "All" ||
    Object.keys(activeFilters).length > 0 ||
    activeAgeFilters.length > 0 ||
    activeGenderFilters.length > 0;
  const clearAllFilters = () => {
    setDateFilter("All");
    setActiveFilters({});
    setActiveAgeFilters([]);
    setActiveGenderFilters([]);
  };

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

  // Handle private event invite links (?joinEvent=<eventId>)
  React.useEffect(() => {
    if (typeof window !== "undefined" && !hasProcessedEventInvite && events.length > 0) {
      const qs = new URLSearchParams(window.location.search);
      const joinEventId = qs.get("joinEvent");
      if (joinEventId) {
        const inviteEvent = events.find((e) => e.id === joinEventId);
        if (inviteEvent) {
          setSelectedEvent(inviteEvent);
          setMode("event_chat");
          window.history.replaceState({}, "", window.location.pathname);
        }
        setHasProcessedEventInvite(true);
      }
    }
  }, [events, hasProcessedEventInvite]);

  // Prefetch persisted feedback for finalized events the user joined, so the
  // upcoming-events bar can hide the ones that were already rated — the
  // in-session feedbackSubmitted flag alone is lost on every app restart.
  React.useEffect(() => {
    if (!user) return;
    events
      .filter(
        (e) =>
          e.status === "finalized" &&
          e.creatorId !== user.uid &&
          e.participants?.includes(user.uid) &&
          userFeedbackCache[e.id] === undefined,
      )
      .forEach((e) => {
        getUserFeedback(e.id)
          .then((fb) => {
            setUserFeedbackCache((prev) => ({ ...prev, [e.id]: fb || "none" }));
          })
          .catch(() => {});
      });
  }, [events, user?.uid]);

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
    if (!liveSelectedEvent || liveSelectedEvent.id === "tutorial-dummy") return;
    // Creator stats
    if (!creatorStatsCache[liveSelectedEvent.creatorId]) {
      getDoc(doc(db, "users", liveSelectedEvent.creatorId))
        .then((snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setCreatorStatsCache((prev) => ({
              ...prev,
              [liveSelectedEvent.creatorId]: {
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
    if (userFeedbackCache[liveSelectedEvent.id] === undefined) {
      getUserFeedback(liveSelectedEvent.id)
        .then((fb) => {
          setUserFeedbackCache((prev) => ({
            ...prev,
            [liveSelectedEvent.id]: fb || "none",
          }));
        })
        .catch(() => {});
    }
    // Init finalize checkboxes
    setFinalizeChecked(
      liveSelectedEvent.participants?.filter(
        (p) => p !== liveSelectedEvent.creatorId,
      ) || [],
    );
    setFeedbackAnswer({});
    // Fetch display names for all participants
    (liveSelectedEvent.participants || []).forEach((uid) => {
      if (!participantNamesCache[uid]) {
        getDoc(doc(db, "users", uid))
          .then((snap) => {
            if (snap.exists()) {
              const d = snap.data();
              setParticipantNamesCache((prev) => ({
                ...prev,
                [uid]: d.displayName || uid.substring(0, 8),
              }));
            }
          })
          .catch(() => {});
      }
    });
  }, [liveSelectedEvent?.id]);

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
        return notify(t('wizard.incompleteTitle'), t('wizard.incompleteBody'));
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
          // Empty when unset - the chat header translates the fallback at display time
          address: draft.address || "",
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
      notify(t('wizard.liveTitle'), t('wizard.liveBody'));
    } catch (err: any) {
      notify(t('common.error'), err.message);
    }
  };

  const handleJoin = async () => {
    if (!liveSelectedEvent || !user) return;
    if (liveSelectedEvent.id === "tutorial-dummy") {
      notify(t('tutorial.congratsTitle'), t('tutorial.congratsBody'));
      setSelectedEvent(null);
      setMode("map");
      setTutStep(-1);
      markTutorialSeen();
      return;
    }
    if (user.tokens < 1) {
      notify(t('join.outOfLeavesTitle'), t('join.outOfLeavesBody'));
      return;
    }
    if (liveSelectedEvent.participants.includes(user.uid)) {
      notify(t('join.alreadyJoinedTitle'), t('join.alreadyJoinedBody'));
      return;
    }
    if (liveSelectedEvent.participants.length >= liveSelectedEvent.participantLimit) {
      notify(t('join.fullTitle'), t('join.fullBody'));
      return;
    }
    try {
      await joinEvent(liveSelectedEvent.id);
      notify(t('join.joinedTitle'), t('join.joinedBody'));
    } catch (e: any) {
      notify(t('common.error'), e.message);
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
    if (!liveSelectedTribe) return null;
    const isChief = liveSelectedTribe.creatorId === user?.uid;
    const isLeader =
      isChief || (liveSelectedTribe.leaders || []).includes(user?.uid || "");
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
            backgroundColor: Colors.bgElevated,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: Colors.glassCardBorder,
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.goldBorder, justifyContent: 'center', alignItems: 'center' }}>
                <Feather name={isChief ? 'award' : 'shield'} size={16} color={Colors.gold} />
              </View>
              <View>
                <Text
                  style={{
                    fontFamily: Typography.headline,
                    fontSize: 19,
                    color: Colors.textPrimary,
                    letterSpacing: -0.2,
                  }}
                >
                  {isChief ? t('tribe.chiefDashboard') : t('tribe.council')}
                </Text>
                <Text style={{ fontFamily: Typography.bodyLight, fontSize: 11, color: Colors.textMuted, marginTop: 1 }}>
                  {isChief ? t('tribe.chiefSubtitle') : t('tribe.councilSubtitle')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowManagement(false)}
              style={{ padding: 6 }}
            >
              <Feather name="x" size={22} color="rgba(255,255,255,0.45)" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {liveSelectedTribe.pendingApplicants.length > 0 && (
              <View
                style={{
                  marginBottom: 18,
                  backgroundColor: Colors.glassCardBg,
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: Colors.glassCardBorder,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Feather name="user-check" size={13} color={Colors.gold} />
                  <Text
                    style={{
                      fontFamily: Typography.bodyLight,
                      fontSize: 11,
                      color: Colors.gold,
                      letterSpacing: 1.4,
                      textTransform: 'uppercase',
                    }}
                  >
                    {tn('tribe.pendingApplications', liveSelectedTribe.pendingApplicants.length)}
                  </Text>
                </View>
                {liveSelectedTribe.pendingApplicants.map((appUid) => (
                  <View
                    key={appUid}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      padding: 13,
                      borderRadius: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <TouchableOpacity onPress={() => setProfileViewUid(appUid)}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: Typography.bodyMedium,
                          color: Colors.textPrimary,
                        }}
                      >
                        {liveSelectedTribe.memberNames?.[appUid] || t('tribe.wanderer', { id: appUid.substring(0, 6) })}
                      </Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            await rejectApplicant(liveSelectedTribe.id, appUid);
                            if (typeof window !== 'undefined') notify(t('tribe.rejected'));
                          } catch (e) {
                            if (typeof window !== 'undefined') notify(t('tribe.rejectFailed'));
                          }
                        }}
                        style={{
                          backgroundColor: Colors.dangerSoft,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 9999,
                          borderWidth: 1,
                          borderColor: Colors.dangerBorder,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: Typography.bodyMedium,
                            color: Colors.danger,
                            fontSize: 12,
                          }}
                        >
                          {t('tribe.reject')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            await acceptApplicant(liveSelectedTribe.id, appUid);
                            if (typeof window !== 'undefined') notify(t('tribe.accepted'));
                          } catch (e) {
                            if (typeof window !== 'undefined') notify(t('tribe.acceptFailed'));
                          }
                        }}
                        style={{
                          backgroundColor: Colors.goldDim,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 9999,
                          borderWidth: 1,
                          borderColor: Colors.goldBorder,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: Typography.bodyMedium,
                            color: Colors.gold,
                            fontSize: 12,
                          }}
                        >
                          {t('tribe.accept')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <View
              style={{
                backgroundColor: Colors.glassCardBg,
                padding: 16,
                borderRadius: 16,
                marginBottom: 18,
                borderWidth: 1,
                borderColor: Colors.glassCardBorder,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Feather name="radio" size={13} color={Colors.gold} />
                <Text
                  style={{
                    fontFamily: Typography.bodyLight,
                    fontSize: 11,
                    color: Colors.gold,
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('tribe.broadcast')}
                </Text>
              </View>
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
                placeholder={t('tribe.announcementPlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.28)"
                multiline
                value={announcementText}
                onChangeText={setAnnouncementText}
              />
              <TouchableOpacity
                onPress={async () => {
                  if (!announcementText.trim()) return;
                  await postAnnouncement(liveSelectedTribe.id, announcementText);
                  setAnnouncementText("");
                  setShowManagement(false);
                }}
                style={{
                  backgroundColor: Colors.glassBtnBg,
                  height: 56,
                  borderRadius: 9999,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 10,
                  borderWidth: 1,
                  borderColor: Colors.gold,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontFamily: Typography.bodyBold,
                    fontSize: 14,
                  }}
                >
                  {t('tribe.sendAnnouncement')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Feather name="users" size={13} color={Colors.gold} />
              <Text
                style={{
                  fontFamily: Typography.bodyLight,
                  fontSize: 11,
                  color: Colors.gold,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                }}
              >
                {t('tribe.membersHeader', { n: liveSelectedTribe.members.length })}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: Colors.glassCardBg,
                borderRadius: 16,
                overflow: "hidden",
                marginBottom: 18,
                borderWidth: 1,
                borderColor: Colors.glassCardBorder,
              }}
            >
              {liveSelectedTribe.members.map((mUid, idx) => {
                const mIsLeader =
                  liveSelectedTribe.creatorId === mUid ||
                  (liveSelectedTribe.leaders || []).includes(mUid);
                const mIsChief = liveSelectedTribe.creatorId === mUid;
                return (
                  <View
                    key={mUid}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 13,
                      borderBottomWidth:
                        idx === liveSelectedTribe.members.length - 1 ? 0 : 1,
                      borderBottomColor: "rgba(255,255,255,0.05)",
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: mIsChief
                          ? Colors.goldDim
                          : mIsLeader
                            ? 'rgba(122,143,160,0.20)'
                            : Colors.glassCardBg,
                        borderWidth: 1,
                        borderColor: mIsChief
                          ? Colors.goldBorder
                          : mIsLeader
                            ? 'rgba(122,143,160,0.45)'
                            : Colors.glassCardBorder,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 11,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: Typography.bodyMedium,
                          color: mIsChief ? Colors.gold : mIsLeader ? '#7A8FA0' : Colors.textSecondary,
                          fontSize: 12,
                        }}
                      >
                        {liveSelectedTribe.memberNames[mUid]?.charAt(0) || "?"}
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
                          {liveSelectedTribe.memberNames[mUid] || "Unknown"}
                        </Text>
                      </TouchableOpacity>
                      {mIsChief ? (
                        <Text style={{ fontFamily: Typography.bodyLight, fontSize: 10, color: Colors.gold, letterSpacing: 0.8 }}>
                          {t('tribe.chief')}
                        </Text>
                      ) : mIsLeader ? (
                        <Text style={{ fontFamily: Typography.bodyLight, fontSize: 10, color: '#7A8FA0', letterSpacing: 0.8 }}>
                          {t('tribe.leader')}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {isChief && !mIsChief && (
                        <TouchableOpacity
                          onPress={() => {
                            if (mIsLeader) demoteMember(liveSelectedTribe.id, mUid);
                            else promoteMember(liveSelectedTribe.id, mUid);
                          }}
                          style={{ padding: 7 }}
                        >
                          <Feather
                            name={mIsLeader ? "shield-off" : "shield"}
                            size={16}
                            color={
                              mIsLeader
                                ? Colors.textMuted
                                : Colors.gold
                            }
                          />
                        </TouchableOpacity>
                      )}
                      {!mIsChief && (isChief || (isLeader && !mIsLeader)) && (
                        <TouchableOpacity
                          onPress={() => {
                            confirmDialog(
                              t('tribe.removeTitle'),
                              t('tribe.removeConfirm', { name: liveSelectedTribe.memberNames[mUid] || '?' }),
                              t('tribe.removeAction'),
                              true,
                            ).then((ok: boolean) => { if (ok) removeMember(liveSelectedTribe.id, mUid); });
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
                  confirmDialog(
                    t('tribe.dissolveTitle'),
                    t('tribe.dissolveConfirm'),
                    t('tribe.dissolveAction'),
                    true,
                  ).then((ok: boolean) => {
                    if (ok) {
                      deleteTribe(liveSelectedTribe.id);
                      setSelectedTribe(null);
                      setShowManagement(false);
                    }
                  });
                }}
                style={{
                  backgroundColor: Colors.dangerSoft,
                  height: 56,
                  borderRadius: 9999,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: Colors.dangerBorder,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="alert-triangle" size={15} color={Colors.danger} />
                  <Text
                    style={{
                      fontFamily: Typography.bodyBold,
                      color: Colors.danger,
                    }}
                  >
                    {t('tribe.dissolveTitle')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    );
  };

  ;

  const renderHUD = () => {
    if (mode !== "map") return null;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate("Settings")}
        >
          <BlurView intensity={65} tint="dark" style={styles.iconWrapper}>
            <Feather name="settings" size={18} color={Colors.text} />
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
          <BlurView intensity={65} tint="dark" style={styles.iconWrapper}>
            <Feather name="navigation" size={18} color={Colors.text} />
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.locateBtn, { top: 170 }]}
          onPress={() => {
            setMode("search_map");
          }}
        >
          <BlurView intensity={65} tint="dark" style={[styles.iconWrapper]}>
            <Feather name="search" size={18} color={Colors.text} />
          </BlurView>
        </TouchableOpacity>

        <View style={styles.topLeft} pointerEvents="box-none">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 15 }}>
            <BlurView intensity={70} tint="dark" style={styles.balancePill}>
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
                  backgroundColor: Colors.glassBtnBg,
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  justifyContent: "center",
                  alignItems: "center",
                  marginLeft: 4,
                  shadowColor: Colors.gold,
                  shadowOpacity: 0.45,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 5,
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
              <Feather name="plus" size={28} color={Colors.textPrimary} />
            </TouchableOpacity>

            {joinedEvents.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.upcomingScroll}
              >
                {joinedEvents.map((e) => {
                  const needsAction =
                    e.status === "finalized" ||
                    (e.time && new Date(e.time) <= new Date());
                  return (
                    <TouchableOpacity
                      key={e.id}
                      style={styles.upcomingIcon}
                      onPress={() => {
                        setSelectedEvent(e);
                        setMode("event_chat");
                      }}
                    >
                      <Text style={styles.upcomingInitial}>
                        {e.title.charAt(0).toUpperCase()}
                      </Text>
                      {needsAction && (
                        <View
                          style={{
                            position: "absolute",
                            top: -1,
                            right: -1,
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: Colors.gold,
                            borderWidth: 2,
                            borderColor: "#1A2421",
                          }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>

        <View style={styles.bottomBar} pointerEvents="box-none">
          <BlurView
            intensity={60}
            tint="dark"
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
                  color="rgba(255,255,255,0.75)"
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
                    {t(`map.dateFilters.${d}`)}
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
                  color="rgba(255,255,255,0.75)"
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
              tint="dark"
              style={[
                styles.filterBtnWrapper,
                Object.keys(activeFilters).length +
                  activeAgeFilters.length +
                  activeGenderFilters.length >
                  0 && {
                  backgroundColor: Colors.gold,
                  borderColor: Colors.gold,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  Object.keys(activeFilters).length +
                    activeAgeFilters.length +
                    activeGenderFilters.length >
                    0 && { color: '#1A2421' },
                ]}
              >
                {t('map.filters')}{" "}
                {Object.keys(activeFilters).length +
                  activeAgeFilters.length +
                  activeGenderFilters.length >
                0
                  ? `(${Object.keys(activeFilters).length + activeAgeFilters.length + activeGenderFilters.length})`
                  : ""}
              </Text>
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Empty-map hint — without it, filters that match nothing make the
            app look broken rather than quiet */}
        {displayEvents.length === 0 && (
          <View
            style={{
              position: "absolute",
              bottom: 100,
              left: 0,
              right: 0,
              alignItems: "center",
            }}
            pointerEvents="box-none"
          >
            <BlurView
              intensity={65}
              tint="dark"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderRadius: 9999,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: Colors.hairline,
              }}
            >
              <Feather name="wind" size={13} color={Colors.textMuted} />
              <Text
                style={{
                  fontFamily: Typography.bodyLight,
                  fontSize: 13,
                  color: Colors.textSecondary,
                }}
              >
                {hasNarrowingFilters ? t('map.emptyFiltered') : t('map.emptyQuiet')}
              </Text>
              {hasNarrowingFilters && (
                <TouchableOpacity onPress={clearAllFilters}>
                  <Text
                    style={{
                      fontFamily: Typography.bodyMedium,
                      fontSize: 13,
                      color: Colors.gold,
                    }}
                  >
                    {t('map.showAll')}
                  </Text>
                </TouchableOpacity>
              )}
            </BlurView>
          </View>
        )}
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
          tint="dark"
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
              placeholder={t('map.searchPlaceholder')}
              placeholderTextColor={Colors.textPlaceholder}
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
                    borderBottomColor: Colors.hairline,
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
                      color: Colors.textPrimary,
                    }}
                    numberOfLines={1}
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
      <BlurView intensity={85} tint="dark" style={styles.glassPanelBottom}>
        <Text style={styles.panelTitle}>{t('wizard.title')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('wizard.titlePlaceholder')}
          placeholderTextColor={Colors.textPlaceholder}
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
                {tValue('categories', cat.id)}
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
                        notify(t('wizard.maxSubcategories'));
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
                    {tValue('subgroups', sub)}
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
          {t('wizard.ageGroup')}
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
                    backgroundColor: Colors.goldDim,
                    borderColor: Colors.goldBorder,
                  },
                ]}
                onPress={() => setDraft({ ...draft, ageGroup: age })}
              >
                <Text
                  style={[
                    styles.wizardSubCatText,
                    draft.ageGroup === age && { color: Colors.gold },
                  ]}
                >
                  {tValue('ages', age)}
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
          {t('wizard.gender')}
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
                  backgroundColor: Colors.goldDim,
                  borderColor: Colors.goldBorder,
                },
              ]}
              onPress={() => setDraft({ ...draft, gender })}
            >
              <Text
                style={[
                  styles.wizardSubCatText,
                  draft.gender === gender && { color: Colors.gold },
                ]}
              >
                {tValue('genders', gender)}
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
            border: `1px solid ${Colors.borderInput}`,
            backgroundColor: Colors.bgInput,
            fontFamily: Typography.body,
            fontSize: "15px",
            color: Colors.textPrimary,
            marginBottom: "15px",
            alignSelf: "center",
            boxSizing: "border-box",
          }}
        />

        <TextInput
          style={styles.input}
          placeholder={t('wizard.locationPlaceholder')}
          placeholderTextColor={Colors.textPlaceholder}
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

        <Text style={styles.panelTitle}>{t('wizard.frequency')}</Text>
        <Text
          style={{
            fontFamily: Typography.body,
            color: Colors.textSecondary,
            marginBottom: 10,
            marginTop: -15,
          }}
        >
          {t('wizard.frequencyHint')}
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
                  backgroundColor: Colors.goldDim,
                  borderColor: Colors.goldBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.wizardSubCatText,
                  (draft.cyclicalRule === rule ||
                    (rule === "once" && !draft.cyclicalRule)) && {
                    color: Colors.gold,
                  },
                ]}
              >
                {rule === "once" ? t('wizard.once') : rule === "weekly" ? t('wizard.weekly') : t('wizard.monthly')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Visibility */}
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
          {t('wizard.visibility')}
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20, paddingHorizontal: "4%" }}>
          <TouchableOpacity
            style={[
              styles.wizardSubCat,
              { flexDirection: "row", gap: 6, alignItems: "center" },
              !draft.isPrivate && { backgroundColor: Colors.goldDim, borderColor: Colors.goldBorder },
            ]}
            onPress={() => setDraft({ ...draft, isPrivate: false })}
          >
            <Feather name="globe" size={13} color={!draft.isPrivate ? Colors.gold : Colors.textSecondary} />
            <Text style={[styles.wizardSubCatText, !draft.isPrivate && { color: Colors.gold }]}>{t('wizard.public')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.wizardSubCat,
              { flexDirection: "row", gap: 6, alignItems: "center" },
              draft.isPrivate && { backgroundColor: Colors.goldDim, borderColor: Colors.goldBorder },
            ]}
            onPress={() => setDraft({ ...draft, isPrivate: true })}
          >
            <Feather name="lock" size={13} color={draft.isPrivate ? Colors.gold : Colors.textSecondary} />
            <Text style={[styles.wizardSubCatText, draft.isPrivate && { color: Colors.gold }]}>{t('wizard.private')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => setMode("map")}
          >
            <Text style={styles.btnSecondaryText}>{t('common.cancel')}</Text>
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
            <Text style={styles.btnPrimaryText}>{t('wizard.setLocation')}</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );

  const renderWizardLocation = () => (
    <View style={styles.glassWrapperTop}>
      <BlurView intensity={90} tint="dark" style={styles.glassPanelTop}>
        <Text style={styles.panelTitleDark}>{t('wizard.dropPin')}</Text>
        <Text style={styles.panelSubDark}>
          {t('wizard.dropPinHint')}
        </Text>
        {draft.location && (
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => setMode("wizard_details")}
            >
              <Text style={styles.btnSecondaryTextDark}>{t('common.back')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleCreate}>
              <Text style={styles.btnPrimaryText}>
                {t('wizard.stakePrefix')}{" "}
                <Image
                  source={require("../assets/leaf.png")}
                  style={styles.inlineIcon}
                  tintColor="#fff"
                />{" "}
                {t('wizard.stakeSuffix')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </BlurView>
    </View>
  );

  ;

  const renderFilters = () => (
    <View style={styles.sheetOverlay} pointerEvents="box-none">
      <View style={styles.glassWrapperBottomFull}>
      <BlurView intensity={90} tint="dark" style={styles.glassPanelBottomFull}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 5,
          }}
        >
          <Text style={styles.panelTitle}>{t('filters.title')}</Text>
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
          {t('filters.subtitle')}
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
                      {tValue('categories', cat.id)}{" "}
                      {isCatActive && activeFilters[cat.id].length > 0
                        ? `(${activeFilters[cat.id].length})`
                        : ""}
                    </Text>
                  </TouchableOpacity>
                  {cat.subgroups.length > 0 && (
                    <TouchableOpacity
                      style={{
                        padding: 15,
                        backgroundColor: Colors.bgInput,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: Colors.hairline,
                      }}
                      onPress={() => setExpandedCat(isExpanded ? null : cat.id)}
                    >
                      <Feather
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={Colors.textSecondary}
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
                            {tValue('subgroups', sub)}
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
                  {t('filters.ageGroup')}{" "}
                  {activeAgeFilters.length > 0
                    ? `(${activeAgeFilters.length})`
                    : ""}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  padding: 15,
                  backgroundColor: Colors.bgInput,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: Colors.hairline,
                }}
                onPress={() => setExpandedAge(!expandedAge)}
              >
                <Feather
                  name={expandedAge ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={Colors.textSecondary}
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
                          {tValue('ages', age)}
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
                  {t('filters.gender')}{" "}
                  {activeGenderFilters.length > 0
                    ? `(${activeGenderFilters.length})`
                    : ""}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  padding: 15,
                  backgroundColor: Colors.bgInput,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: Colors.hairline,
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
                        {tValue('genders', gender)}
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
    </View>
  );

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
              {t('tutorial.welcomeTitle')}
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
              {t('tutorial.welcomeBody')}
            </Text>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => setTutStep(1)}
            >
              <Text style={styles.btnPrimaryText}>{t('tutorial.startTour')}</Text>
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
                backgroundColor: Colors.bg,
                padding: 20,
                borderRadius: 20,
                width: 260,
                shadowColor: "#000",
                shadowOpacity: 0.35,
                shadowRadius: 20,
                elevation: 15,
                borderWidth: 1,
                borderColor: Colors.hairline,
              }}
              pointerEvents="auto"
            >
              <Feather
                name="arrow-up"
                size={30}
                color={Colors.gold}
                style={{ position: "absolute", top: -25, left: 25 }}
              />
              <Text
                style={{
                  fontFamily: Typography.bodySemibold,
                  color: Colors.textPrimary,
                  marginBottom: 10,
                }}
              >
                {t('tutorial.s1Title')}
              </Text>
              <Text
                style={{
                  fontFamily: Typography.body,
                  color: Colors.textSecondary,
                  marginBottom: 15,
                }}
              >
                {t('tutorial.s1Body')}
              </Text>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { alignSelf: "flex-end", paddingVertical: 10 },
                ]}
                onPress={() => setTutStep(2)}
              >
                <Text style={styles.btnPrimaryText}>{t('common.next')}</Text>
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
                backgroundColor: Colors.bg,
                padding: 20,
                borderRadius: 20,
                width: 260,
                shadowColor: "#000",
                shadowOpacity: 0.35,
                shadowRadius: 20,
                elevation: 15,
                borderWidth: 1,
                borderColor: Colors.hairline,
              }}
              pointerEvents="auto"
            >
              <Feather
                name="arrow-up"
                size={30}
                color={Colors.gold}
                style={{ position: "absolute", top: -25, right: 5 }}
              />
              <Text
                style={{
                  fontFamily: Typography.bodySemibold,
                  color: Colors.textPrimary,
                  marginBottom: 10,
                }}
              >
                {t('tutorial.s2Title')}
              </Text>
              <Text
                style={{
                  fontFamily: Typography.body,
                  color: Colors.textSecondary,
                  marginBottom: 15,
                }}
              >
                {t('tutorial.s2Body')}
              </Text>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { alignSelf: "flex-end", paddingVertical: 10 },
                ]}
                onPress={() => setTutStep(3)}
              >
                <Text style={styles.btnPrimaryText}>{t('common.next')}</Text>
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
                backgroundColor: Colors.bg,
                padding: 20,
                borderRadius: 20,
                width: 260,
                shadowColor: "#000",
                shadowOpacity: 0.35,
                shadowRadius: 20,
                elevation: 15,
                borderWidth: 1,
                borderColor: Colors.hairline,
              }}
              pointerEvents="auto"
            >
              <Feather
                name="arrow-up"
                size={30}
                color={Colors.gold}
                style={{ position: "absolute", top: -25, right: 5 }}
              />
              <Text
                style={{
                  fontFamily: Typography.bodySemibold,
                  color: Colors.textPrimary,
                  marginBottom: 10,
                }}
              >
                {t('tutorial.s3Title')}
              </Text>
              <Text
                style={{
                  fontFamily: Typography.body,
                  color: Colors.textSecondary,
                  marginBottom: 15,
                }}
              >
                {t('tutorial.s3Body')}
              </Text>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { alignSelf: "flex-end", paddingVertical: 10 },
                ]}
                onPress={() => setTutStep(4)}
              >
                <Text style={styles.btnPrimaryText}>{t('common.next')}</Text>
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
                backgroundColor: Colors.bg,
                padding: 20,
                borderRadius: 20,
                width: 260,
                shadowColor: "#000",
                shadowOpacity: 0.35,
                shadowRadius: 20,
                elevation: 15,
                borderWidth: 1,
                borderColor: Colors.hairline,
              }}
              pointerEvents="auto"
            >
              <Feather
                name="arrow-down"
                size={30}
                color={Colors.gold}
                style={{ position: "absolute", bottom: -25, right: 10 }}
              />
              <Text
                style={{
                  fontFamily: Typography.bodySemibold,
                  color: Colors.textPrimary,
                  marginBottom: 10,
                }}
              >
                {t('tutorial.s4Title')}
              </Text>
              <Text
                style={{
                  fontFamily: Typography.body,
                  color: Colors.textSecondary,
                  marginBottom: 15,
                }}
              >
                {t('tutorial.s4Body')}
              </Text>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { alignSelf: "flex-end", paddingVertical: 10 },
                ]}
                onPress={() => setTutStep(5)}
              >
                <Text style={styles.btnPrimaryText}>{t('common.next')}</Text>
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
              backgroundColor: Colors.bg,
              padding: 20,
              borderRadius: 20,
              width: 260,
              shadowColor: "#000",
              shadowOpacity: 0.35,
              shadowRadius: 20,
              elevation: 15,
              borderWidth: 1,
              borderColor: Colors.hairline,
              zIndex: 9999,
            }}
          >
            <Feather
              name="arrow-up"
              size={30}
              color={Colors.gold}
              style={{ position: "absolute", top: -25, left: 14 }}
            />
            <Text
              style={{ fontFamily: Typography.bodySemibold, color: Colors.textPrimary, marginBottom: 10 }}
            >
              {t('tutorial.s5Title')}
            </Text>
            <Text
              style={{
                fontFamily: Typography.body,
                color: Colors.textSecondary,
                marginBottom: 15,
              }}
            >
              {t('tutorial.s5Body')}
            </Text>
            <TouchableOpacity
              style={[
                styles.btnPrimary,
                { alignSelf: "flex-end", paddingVertical: 10 },
              ]}
              onPress={() => setTutStep(6)}
            >
              <Text style={styles.btnPrimaryText}>{t('common.next')}</Text>
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
              backgroundColor: Colors.bg,
              padding: 20,
              borderRadius: 20,
              width: 300,
              shadowColor: "#000",
              shadowOpacity: 0.35,
              shadowRadius: 20,
              elevation: 15,
              borderWidth: 1,
              borderColor: Colors.hairline,
              zIndex: 9999,
            }}
          >
            <Text
              style={{ fontFamily: Typography.bodySemibold, color: Colors.textPrimary, marginBottom: 10 }}
            >
              {t('tutorial.s6Title')}
            </Text>
            <Text
              style={{
                fontFamily: Typography.body,
                color: Colors.textSecondary,
                marginBottom: 10,
              }}
            >
              {t('tutorial.s6Body')}
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
                {t('tutorial.skip')}
              </Text>
            </TouchableOpacity>
            <Feather
              name="arrow-down"
              size={30}
              color={Colors.gold}
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
              backgroundColor: Colors.bg,
              padding: 20,
              borderRadius: 20,
              width: 300,
              shadowColor: "#000",
              shadowOpacity: 0.35,
              shadowRadius: 20,
              elevation: 15,
              borderWidth: 1,
              borderColor: Colors.hairline,
              zIndex: 9999,
            }}
            pointerEvents="none"
          >
            <Text
              style={{ fontFamily: Typography.bodySemibold, color: Colors.textPrimary, marginBottom: 10 }}
            >
              {t('tutorial.s7Title')}
            </Text>
            <Text
              style={{
                fontFamily: Typography.body,
                color: Colors.textSecondary,
                marginBottom: 15,
              }}
            >
              {t('tutorial.s7Body')}
            </Text>
            <Feather
              name="arrow-down"
              size={30}
              color={Colors.gold}
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

  ;

  return (
    <View style={styles.container}>
      {/* Monochromatic parchment wash — the CSS filter desaturates map hues and
          applies a warm sepia tone so the entire canvas reads as a single pale sage */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      {/* Hide Mapbox branding from canvas — attribution is in Settings per ToS */}
      <style>{`.mapboxgl-ctrl-logo,.mapboxgl-ctrl-attrib{display:none!important}`}</style>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: user?.homeLocation?.longitude || 19.0238,
          latitude: user?.homeLocation?.latitude || 50.2649,
          zoom: 12.5,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyleUrl}
        mapboxAccessToken={MAPBOX_TOKEN}
        attributionControl={false}
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
                      backgroundColor: Colors.gold,
                      color: "#1A2421",
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
                background: "rgba(26,36,33,0.94)",
                backdropFilter: "blur(12px)",
                borderRadius: 14,
                padding: 8,
                minWidth: 200,
                maxWidth: 260,
                boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
                border: `1px solid ${Colors.hairline}`,
              }}
            >
              {selectedCluster.events.map((ev, i) => {
                const cat = EVENT_CATEGORIES.find(
                  (c) => c.id === ev.categoryId,
                );
                const timeStr = ev.time
                  ? format(new Date(ev.time), t('dates.clusterTime'), { locale: dateLocale })
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
                          ? "1px solid rgba(255,255,255,0.07)"
                          : "none",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
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
                          color: "rgba(255,255,255,0.92)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ev.title}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
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
      </div>

      {renderHUD()}
      {renderDevTools()}
      {mode === "wizard_details" && renderWizardDetails()}
      {mode === "wizard_location" && renderWizardLocation()}
      {mode === "event_chat" && <EventChat selectedEvent={liveSelectedEvent} setSelectedEvent={setSelectedEvent} setMode={setMode} user={user} events={events} joinEvent={joinEvent} deleteEvent={deleteEvent} finalizeEvent={finalizeEvent} finalizeChecked={finalizeChecked} setFinalizeChecked={setFinalizeChecked} submitFeedback={submitFeedback} feedbackAnswer={feedbackAnswer} setFeedbackAnswer={setFeedbackAnswer} feedbackSubmitted={feedbackSubmitted} setFeedbackSubmitted={setFeedbackSubmitted} getUserFeedback={getUserFeedback} userFeedbackCache={userFeedbackCache} setUserFeedbackCache={setUserFeedbackCache} creatorStatsCache={creatorStatsCache} setCreatorStatsCache={setCreatorStatsCache} participantNamesCache={participantNamesCache} setParticipantNamesCache={setParticipantNamesCache} getParticipantNames={undefined} tribes={tribes} setProfileViewUid={setProfileViewUid} setSelectedTribe={setSelectedTribe} handleJoin={handleJoin} setFormTribeChecked={setFormTribeChecked} formTribeChecked={formTribeChecked} setWizardDraft={setWizardDraft} setWizardStep={setWizardStep} />}
      {mode === "filters" && renderFilters()}
      {mode === "tribe_panel" && <TribePanel selectedTribe={liveSelectedTribe} setSelectedTribe={setSelectedTribe} user={user} applyToTribe={applyToTribe} leaveTribe={leaveTribe} showManagement={showManagement} setShowManagement={setShowManagement} announcementText={announcementText} setAnnouncementText={setAnnouncementText} postAnnouncement={postAnnouncement} acceptApplicant={acceptApplicant} rejectApplicant={rejectApplicant} removeMember={removeMember} deleteTribe={deleteTribe} updateTribe={updateTribe} promoteMember={promoteMember} demoteMember={demoteMember} events={events} setMode={setMode} setSelectedEvent={setSelectedEvent} setDraft={setDraft} draft={draft} setProfileViewUid={setProfileViewUid} renderManagementOverlay={renderManagementOverlay} />}
      {mode === "create_tribe_wizard" && <CreateTribeWizard wizardDraft={wizardDraft} setWizardDraft={setWizardDraft} wizardStep={wizardStep} setWizardStep={setWizardStep} createTribe={createTribe} setMode={setMode} user={user} formTribeChecked={formTribeChecked} setFormTribeChecked={setFormTribeChecked} />}
      {renderMapSearch()}
      {renderTutorial()}
      {<ProfileModal profileViewData={profileViewData} profileViewUid={profileViewUid} setProfileViewUid={setProfileViewUid} setProfileViewData={setProfileViewData} />}
    </View>
  );
}

