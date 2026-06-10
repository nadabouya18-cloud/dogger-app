import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useBookingStore = create(
  persist(
    (set) => ({
      // Type de flow
      flowType: null,
      setFlowType: (type) => set({ flowType: type }),

      // Walk
      walkStep: 1,
      walkService: 'walk',
      walkDuration: 30,
      walkMode: 'now',
      walkAddress: '',
      walkDate: '',
      walkTime: '',
      walkInstructions: '',
      setWalkStep: (step) => set({ walkStep: step }),
      setWalkService: (s) => set({ walkService: s }),
      setWalkDuration: (d) => set({ walkDuration: d }),
      setWalkMode: (m) => set({ walkMode: m }),
      setWalkAddress: (a) => set({ walkAddress: a }),
      setWalkDate: (d) => set({ walkDate: d }),
      setWalkTime: (t) => set({ walkTime: t }),
      setWalkInstructions: (i) => set({ walkInstructions: i }),

      // Home
      homeStep: 1,
      homeMode: 'now',
      homeDuration: 300,
      homeAddress: '',
      homeStartDate: '',
      homeEndDate: '',
      homeDepositTime: '',
      homePickupTime: '',
      homeFoodInfo: '',
      homeMedInfo: '',
      homeBehaviorInfo: '',
      homeAccessories: '',
      homeInstructions: '',
      selectedHomeWalker: null,
      homeConfirmed: false,
      dogHandedOver: false,
      setHomeStep: (step) => set({ homeStep: step }),
      setHomeMode: (m) => set({ homeMode: m }),
      setHomeDuration: (d) => set({ homeDuration: d }),
      setHomeAddress: (a) => set({ homeAddress: a }),
      setHomeStartDate: (d) => set({ homeStartDate: d }),
      setHomeEndDate: (d) => set({ homeEndDate: d }),
      setHomeDepositTime: (t) => set({ homeDepositTime: t }),
      setHomePickupTime: (t) => set({ homePickupTime: t }),
      setHomeFoodInfo: (i) => set({ homeFoodInfo: i }),
      setHomeMedInfo: (i) => set({ homeMedInfo: i }),
      setHomeBehaviorInfo: (i) => set({ homeBehaviorInfo: i }),
      setHomeAccessories: (a) => set({ homeAccessories: a }),
      setHomeInstructions: (i) => set({ homeInstructions: i }),
      setSelectedHomeWalker: (w) => set({ selectedHomeWalker: w }),
      setHomeConfirmed: (v) => set({ homeConfirmed: v }),
      setDogHandedOver: (v) => set({ dogHandedOver: v }),

      // Walker / matching
      walker: null,
      walkerPhase: 'incoming',
      etaSeconds: 480,
      matched: false,
      searching: false,
      userCoords: null,
      selectedDogs: [],
      setWalker: (w) => set({ walker: w }),
      setWalkerPhase: (p) => set({ walkerPhase: p }),
      setEtaSeconds: (s) => set({ etaSeconds: s }),
      setMatched: (v) => set({ matched: v }),
      setSearching: (v) => set({ searching: v }),
      setUserCoords: (c) => set({ userCoords: c }),
      setSelectedDogs: (d) => set({ selectedDogs: d }),

      // Reset complet — appelé quand on retourne au dashboard
      resetBooking: () => set({
        flowType: null,
        walkStep: 1, walkService: 'walk', walkDuration: 30, walkMode: 'now',
        walkAddress: '', walkDate: '', walkTime: '', walkInstructions: '',
        homeStep: 1, homeMode: 'now', homeDuration: 300, homeAddress: '',
        homeStartDate: '', homeEndDate: '', homeDepositTime: '', homePickupTime: '',
        homeFoodInfo: '', homeMedInfo: '', homeBehaviorInfo: '', homeAccessories: '',
        homeInstructions: '', selectedHomeWalker: null, homeConfirmed: false,
        dogHandedOver: false, walker: null, walkerPhase: 'incoming',
        etaSeconds: 480, matched: false, searching: false, selectedDogs: [],
        userCoords: null,
      }),
    }),
    {
      name: 'dogger-booking',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useBookingStore;