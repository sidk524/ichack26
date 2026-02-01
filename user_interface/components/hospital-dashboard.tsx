"use client"

import { useState, useEffect } from "react"
import {
  IconAmbulance,
  IconBed,
  IconCircleFilled,
  IconClock,
  IconDroplet,
  IconLungs,
  IconChevronRight,
  IconLoader2,
  IconPhone,
  IconMapPin,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import type { IncomingPatient, Hospital, HospitalCapacity } from "@/types/api"

const severityStyles: Record<IncomingPatient["severity"], string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  moderate: "bg-yellow-500",
  low: "bg-green-500",
}

const statusColors: Record<string, string> = {
  accepting: "text-green-500",
  limited: "text-yellow-500",
  diverting: "text-orange-500",
  closed: "text-red-500",
}

/**
 * HospitalDashboard displays the main hospital overview
 * Fetches hospitals and capacity from real backend API
 */
export function HospitalDashboard() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("")
  const [capacity, setCapacity] = useState<HospitalCapacity | null>(null)
  const [incomingPatients, setIncomingPatients] = useState<IncomingPatient[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Use mock hospitals data
  useEffect(() => {
    const mockHospitals: Hospital[] = [
      {
        id: "st-marys",
        name: "St. Mary's General Hospital",
        distance: 2.3,
        status: "accepting",
        erAvailable: 8,
        icuAvailable: 3,
        specialties: [
          "Emergency Medicine",
          "Level II Trauma Center",
          "Cardiology",
          "Orthopedic Surgery",
          "General Surgery",
          "Internal Medicine",
          "Radiology & Imaging"
        ],
        coordinates: { lat: 51.5074, lon: -0.1278 }
      },
      {
        id: "kings-college",
        name: "King's College Hospital NHS Foundation Trust",
        distance: 4.1,
        status: "limited",
        erAvailable: 2,
        icuAvailable: 1,
        specialties: [
          "Emergency Medicine",
          "Neurosurgery",
          "Pediatrics & NICU",
          "Maternal & Fetal Medicine",
          "Liver Transplant Center",
          "Stroke Center",
          "Hematology & Oncology"
        ],
        coordinates: { lat: 51.4686, lon: -0.0981 }
      },
      {
        id: "royal-london",
        name: "The Royal London Hospital (Barts Health)",
        distance: 6.8,
        status: "accepting",
        erAvailable: 12,
        icuAvailable: 5,
        specialties: [
          "Level I Major Trauma Center",
          "Emergency Medicine",
          "Burns & Plastic Surgery",
          "Neurosurgery",
          "Cardiac Surgery",
          "Helicopter Emergency Medical Service",
          "Toxicology & Poison Control",
          "Hand Surgery"
        ],
        coordinates: { lat: 51.5174, lon: -0.0599 }
      },
      {
        id: "uclh",
        name: "University College London Hospital",
        distance: 3.2,
        status: "diverting",
        erAvailable: 1,
        icuAvailable: 0,
        specialties: [
          "Emergency Medicine",
          "Comprehensive Cancer Center",
          "Neurology & Neurosurgery",
          "Transplant Services",
          "Women's Health",
          "Clinical Research",
          "Nuclear Medicine"
        ],
        coordinates: { lat: 51.5246, lon: -0.1357 }
      },
      {
        id: "guys-hospital",
        name: "Guy's Hospital (Guy's and St Thomas')",
        distance: 5.5,
        status: "accepting",
        erAvailable: 6,
        icuAvailable: 2,
        specialties: [
          "Emergency Medicine",
          "Cardiac Surgery & Catheterization",
          "Organ Transplantation",
          "Renal Services",
          "Oral & Maxillofacial Surgery",
          "Endocrinology",
          "Genetic Medicine"
        ],
        coordinates: { lat: 51.5032, lon: -0.0875 }
      },
      {
        id: "st-thomas",
        name: "St Thomas' Hospital",
        distance: 4.7,
        status: "accepting",
        erAvailable: 9,
        icuAvailable: 4,
        specialties: [
          "Emergency Medicine",
          "Cardiac Surgery",
          "Neurosurgery",
          "Women & Children's Services",
          "Kidney Care Centre",
          "Evelina London Children's Hospital",
          "Westminster Bridge Road"
        ],
        coordinates: { lat: 51.4989, lon: -0.1180 }
      },
      {
        id: "chelsea-westminster",
        name: "Chelsea and Westminster Hospital",
        distance: 8.2,
        status: "limited",
        erAvailable: 4,
        icuAvailable: 2,
        specialties: [
          "Emergency Medicine",
          "Women & Children's Services",
          "Burns Centre",
          "HIV/AIDS Treatment",
          "Plastic Surgery",
          "Maternity Services"
        ],
        coordinates: { lat: 51.4890, lon: -0.1694 }
      },
      {
        id: "imperial-charing-cross",
        name: "Charing Cross Hospital (Imperial College)",
        distance: 7.1,
        status: "accepting",
        erAvailable: 7,
        icuAvailable: 3,
        specialties: [
          "Emergency Medicine",
          "Stroke Centre",
          "Renal & Transplant Centre",
          "Cardiothoracic Surgery",
          "Neurosciences",
          "Accident & Emergency"
        ],
        coordinates: { lat: 51.4890, lon: -0.2201 }
      }
    ]

    setHospitals(mockHospitals)
    if (mockHospitals.length > 0 && !selectedHospitalId) {
      setSelectedHospitalId(mockHospitals[0].id)
    }
    setIsLoading(false)
  }, [])

  // Use mock capacity and incoming patients data
  useEffect(() => {
    if (!selectedHospitalId) return

    // Mock capacity data based on selected hospital
    const mockCapacityData: Record<string, HospitalCapacity> = {
      "st-marys": {
        hospitalId: "st-marys",
        totalOccupancy: 78,
        beds: [
          { id: "er", name: "Emergency Room", total: 12, available: 8, pending: 2 },
          { id: "icu", name: "Intensive Care", total: 8, available: 3, pending: 1 },
          { id: "general", name: "General Ward", total: 45, available: 12, pending: 3 },
          { id: "pediatric", name: "Pediatric", total: 15, available: 8, pending: 1 },
          { id: "burn", name: "Burn Unit", total: 6, available: 4, pending: 0 },
          { id: "surgical", name: "Surgical", total: 20, available: 6, pending: 2 }
        ]
      },
      "kings-college": {
        hospitalId: "kings-college",
        totalOccupancy: 91,
        beds: [
          { id: "er", name: "Emergency Room", total: 8, available: 2, pending: 1 },
          { id: "icu", name: "Intensive Care", total: 6, available: 1, pending: 0 },
          { id: "general", name: "General Ward", total: 38, available: 4, pending: 2 },
          { id: "pediatric", name: "Pediatric", total: 18, available: 3, pending: 1 },
          { id: "burn", name: "Burn Unit", total: 4, available: 1, pending: 0 },
          { id: "surgical", name: "Surgical", total: 16, available: 2, pending: 1 }
        ]
      },
      "royal-london": {
        hospitalId: "royal-london",
        totalOccupancy: 65,
        beds: [
          { id: "er", name: "Emergency Room", total: 18, available: 12, pending: 3 },
          { id: "icu", name: "Intensive Care", total: 12, available: 5, pending: 2 },
          { id: "general", name: "General Ward", total: 60, available: 22, pending: 4 },
          { id: "pediatric", name: "Pediatric", total: 12, available: 6, pending: 1 },
          { id: "burn", name: "Burn Unit", total: 10, available: 7, pending: 1 },
          { id: "surgical", name: "Surgical", total: 25, available: 9, pending: 2 }
        ]
      },
      "uclh": {
        hospitalId: "uclh",
        totalOccupancy: 94,
        beds: [
          { id: "er", name: "Emergency Room", total: 10, available: 1, pending: 0 },
          { id: "icu", name: "Intensive Care", total: 8, available: 0, pending: 0 },
          { id: "general", name: "General Ward", total: 42, available: 3, pending: 1 },
          { id: "pediatric", name: "Pediatric", total: 14, available: 1, pending: 0 },
          { id: "burn", name: "Burn Unit", total: 5, available: 0, pending: 0 },
          { id: "surgical", name: "Surgical", total: 18, available: 1, pending: 0 }
        ]
      },
      "guys-hospital": {
        hospitalId: "guys-hospital",
        totalOccupancy: 73,
        beds: [
          { id: "er", name: "Emergency Room", total: 14, available: 6, pending: 2 },
          { id: "icu", name: "Intensive Care", total: 10, available: 2, pending: 1 },
          { id: "general", name: "General Ward", total: 50, available: 15, pending: 3 },
          { id: "pediatric", name: "Pediatric", total: 16, available: 5, pending: 1 },
          { id: "burn", name: "Burn Unit", total: 8, available: 3, pending: 0 },
          { id: "surgical", name: "Surgical", total: 22, available: 8, pending: 2 }
        ]
      },
      "st-thomas": {
        hospitalId: "st-thomas",
        totalOccupancy: 69,
        beds: [
          { id: "er", name: "Emergency Room", total: 16, available: 9, pending: 3 },
          { id: "icu", name: "Intensive Care", total: 14, available: 4, pending: 2 },
          { id: "general", name: "General Ward", total: 55, available: 18, pending: 4 },
          { id: "pediatric", name: "Pediatric", total: 20, available: 7, pending: 2 },
          { id: "burn", name: "Burn Unit", total: 6, available: 2, pending: 0 },
          { id: "surgical", name: "Surgical", total: 28, available: 11, pending: 3 }
        ]
      },
      "chelsea-westminster": {
        hospitalId: "chelsea-westminster",
        totalOccupancy: 85,
        beds: [
          { id: "er", name: "Emergency Room", total: 12, available: 4, pending: 1 },
          { id: "icu", name: "Intensive Care", total: 8, available: 2, pending: 0 },
          { id: "general", name: "General Ward", total: 35, available: 6, pending: 2 },
          { id: "pediatric", name: "Pediatric", total: 22, available: 4, pending: 1 },
          { id: "burn", name: "Burns Centre", total: 12, available: 3, pending: 1 },
          { id: "surgical", name: "Surgical", total: 18, available: 3, pending: 1 }
        ]
      },
      "imperial-charing-cross": {
        hospitalId: "imperial-charing-cross",
        totalOccupancy: 71,
        beds: [
          { id: "er", name: "Emergency Room", total: 15, available: 7, pending: 2 },
          { id: "icu", name: "Intensive Care", total: 10, available: 3, pending: 1 },
          { id: "general", name: "General Ward", total: 48, available: 16, pending: 3 },
          { id: "pediatric", name: "Pediatric", total: 12, available: 4, pending: 1 },
          { id: "burn", name: "Burn Unit", total: 5, available: 2, pending: 0 },
          { id: "surgical", name: "Cardiothoracic Surgery", total: 24, available: 8, pending: 2 }
        ]
      }
    }

    // Mock incoming patients based on selected hospital
    const mockIncomingPatientsData: Record<string, IncomingPatient[]> = {
      "st-marys": [
        {
          id: 101,
          unit: "Ambulance 24",
          eta: 8,
          severity: "critical",
          condition: "Cardiac Arrest",
          needs: "ICU"
        },
        {
          id: 102,
          unit: "Fire Rescue 12",
          eta: 15,
          severity: "high",
          condition: "Burn Injuries (30% body)",
          needs: "Burn Unit"
        },
        {
          id: 103,
          unit: "Ambulance 18",
          eta: 22,
          severity: "moderate",
          condition: "Motor Vehicle Accident",
          needs: "ER"
        }
      ],
      "kings-college": [
        {
          id: 201,
          unit: "Ambulance 31",
          eta: 5,
          severity: "critical",
          condition: "Stroke Symptoms",
          needs: "ICU"
        },
        {
          id: 202,
          unit: "Pediatric Unit 7",
          eta: 12,
          severity: "high",
          condition: "Respiratory Distress",
          needs: "Pediatric ICU"
        }
      ],
      "royal-london": [
        {
          id: 301,
          unit: "Trauma Team Alpha",
          eta: 3,
          severity: "critical",
          condition: "Multi-trauma (Fall from height)",
          needs: "Trauma Bay"
        },
        {
          id: 302,
          unit: "Ambulance 45",
          eta: 18,
          severity: "moderate",
          condition: "Chest Pain",
          needs: "ER"
        },
        {
          id: 303,
          unit: "Fire Rescue 23",
          eta: 25,
          severity: "high",
          condition: "Chemical Burns",
          needs: "Burn Unit"
        },
        {
          id: 304,
          unit: "Ambulance 52",
          eta: 28,
          severity: "low",
          condition: "Minor Laceration",
          needs: "ER"
        }
      ],
      "uclh": [
        {
          id: 401,
          unit: "Ambulance 67",
          eta: 35,
          severity: "moderate",
          condition: "Allergic Reaction",
          needs: "ER"
        }
      ],
      "guys-hospital": [
        {
          id: 501,
          unit: "Cardiac Unit 9",
          eta: 7,
          severity: "critical",
          condition: "STEMI (Heart Attack)",
          needs: "Cardiac Cath Lab"
        },
        {
          id: 502,
          unit: "Ambulance 33",
          eta: 16,
          severity: "high",
          condition: "Overdose",
          needs: "ER"
        },
        {
          id: 503,
          unit: "Ambulance 28",
          eta: 31,
          severity: "moderate",
          condition: "Diabetic Emergency",
          needs: "ER"
        }
      ],
      "st-thomas": [
        {
          id: 601,
          unit: "Thames HEMS",
          eta: 4,
          severity: "critical",
          condition: "Helicopter Trauma",
          needs: "Trauma Bay"
        },
        {
          id: 602,
          unit: "Neonatal Transport",
          eta: 11,
          severity: "critical",
          condition: "Premature Birth Complications",
          needs: "NICU"
        },
        {
          id: 603,
          unit: "Ambulance 41",
          eta: 19,
          severity: "moderate",
          condition: "Kidney Stones",
          needs: "ER"
        }
      ],
      "chelsea-westminster": [
        {
          id: 701,
          unit: "Maternity Emergency",
          eta: 6,
          severity: "high",
          condition: "Emergency C-Section",
          needs: "Maternity Theatre"
        },
        {
          id: 702,
          unit: "Burns Unit Transfer",
          eta: 14,
          severity: "critical",
          condition: "House Fire (45% burns)",
          needs: "Burns ICU"
        }
      ],
      "imperial-charing-cross": [
        {
          id: 801,
          unit: "Stroke Team",
          eta: 9,
          severity: "critical",
          condition: "Acute Stroke",
          needs: "Stroke Unit"
        },
        {
          id: 802,
          unit: "Ambulance 59",
          eta: 21,
          severity: "high",
          condition: "Kidney Failure",
          needs: "Renal Unit"
        },
        {
          id: 803,
          unit: "Air Ambulance",
          eta: 26,
          severity: "moderate",
          condition: "Road Traffic Accident",
          needs: "ER"
        }
      ]
    }

    setCapacity(mockCapacityData[selectedHospitalId] || null)
    setIncomingPatients(mockIncomingPatientsData[selectedHospitalId] || [])
  }, [selectedHospitalId])

  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Get bed data from capacity
  const erBed = capacity?.beds.find((b) => b.id === "er")
  const icuBed = capacity?.beds.find((b) => b.id === "icu")
  const generalBed = capacity?.beds.find((b) => b.id === "general")
  const pediatricBed = capacity?.beds.find((b) => b.id === "pediatric")

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 max-w-4xl mx-auto w-full">

      {/* 1. STATUS HEADER - Hospital selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue placeholder="Select hospital" />
            </SelectTrigger>
            <SelectContent>
              {hospitals.map((hospital) => (
                <SelectItem key={hospital.id} value={hospital.id}>
                  <div className="flex items-center gap-2">
                    <IconCircleFilled className={cn("size-2", statusColors[hospital.status])} />
                    {hospital.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedHospital && (
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <IconMapPin className="size-3" />
                {selectedHospital.coordinates ? `${selectedHospital.coordinates.lat.toFixed(4)}, ${selectedHospital.coordinates.lon.toFixed(4)}` : "Unknown"}
              </span>
              <span className="capitalize flex items-center gap-1">
                <IconCircleFilled className={cn("size-2", statusColors[selectedHospital.status])} />
                {selectedHospital.status}
              </span>
            </div>
          )}
        </div>
        <Badge
          variant={selectedHospital?.status === "accepting" ? "default" : "destructive"}
          className="text-sm px-3 py-1"
        >
          {capacity ? `${capacity.totalOccupancy}% Occupied` : "Loading..."}
        </Badge>
      </div>

      {/* 2. KEY METRICS - Quick glance at capacity */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          icon={IconBed}
          label="ER Beds"
          value={erBed ? String(erBed.available) : "-"}
          subtext={erBed ? `of ${erBed.total} available` : "loading"}
          alert={erBed ? erBed.available < erBed.total * 0.2 : false}
        />
        <MetricCard
          icon={IconLungs}
          label="ICU"
          value={icuBed ? String(icuBed.available) : "-"}
          subtext={icuBed ? `of ${icuBed.total} available` : "loading"}
          alert={icuBed ? icuBed.available < icuBed.total * 0.2 : false}
        />
        <MetricCard
          icon={IconBed}
          label="General"
          value={generalBed ? String(generalBed.available) : "-"}
          subtext={generalBed ? `of ${generalBed.total} available` : "loading"}
          alert={generalBed ? generalBed.available < generalBed.total * 0.2 : false}
        />
        <MetricCard
          icon={IconBed}
          label="Pediatric"
          value={pediatricBed ? String(pediatricBed.available) : "-"}
          subtext={pediatricBed ? `of ${pediatricBed.total} available` : "loading"}
          alert={pediatricBed ? pediatricBed.available < pediatricBed.total * 0.2 : false}
        />
      </div>

      {/* 3. INCOMING PATIENTS - Primary focus */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">Incoming Patients</h2>
              <Badge variant="secondary">{incomingPatients.length} en route</Badge>
            </div>
          </div>

          <div className="divide-y">
            {incomingPatients.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                {/* ETA - Most important */}
                <div className="text-center min-w-16">
                  <div className="text-2xl font-bold">{patient.eta}</div>
                  <div className="text-xs text-muted-foreground">min</div>
                </div>

                {/* Severity indicator */}
                <div className={cn("w-1 h-12 rounded-full", severityStyles[patient.severity as keyof typeof severityStyles])} />

                {/* Patient info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{patient.condition}</span>
                    <Badge variant="outline" className="text-xs">
                      {patient.needs}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <IconAmbulance className="size-3.5" />
                    <span>{patient.unit}</span>
                  </div>
                </div>

                {/* Action */}
                <Button variant="ghost" size="icon">
                  <IconChevronRight className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          {incomingPatients.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No incoming patients
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. QUICK ACTIONS */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm">Request Blood</Button>
        <Button variant="outline" size="sm">Request Staff</Button>
        <Button variant="outline" size="sm">View Network</Button>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  alert = false,
}: {
  icon: typeof IconBed
  label: string
  value: string
  subtext: string
  alert?: boolean
}) {
  return (
    <Card className={cn(alert && "border-orange-200 dark:border-orange-900")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Icon className="size-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={cn("text-2xl font-bold", alert && "text-orange-600")}>{value}</span>
          <span className="text-xs text-muted-foreground">{subtext}</span>
        </div>
      </CardContent>
    </Card>
  )
}
