import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Wand2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { getClubCoordinates, getCountryCenter } from "@/lib/europeanCityCoordinates";

interface MapClub {
  id: string;
  club_name: string;
  country: string | null;
  x_position: number | null;
  y_position: number | null;
  latitude: number | null;
  longitude: number | null;
  is_calibration_point: boolean;
}

interface CalibrationPoint {
  lat: number;
  lng: number;
  x: number;
  y: number;
}

interface MapCalibrationToolProps {
  clubs: MapClub[];
  onRefresh: () => void;
  selectedCountry: string;
}

export const MapCalibrationTool = ({ clubs, onRefresh, selectedCountry }: MapCalibrationToolProps) => {
  const [calibrating, setCalibrating] = useState(false);
  const [populatingCoords, setPopulatingCoords] = useState(false);

  // Get calibration stats per country
  const calibrationStats = useMemo(() => {
    const stats: Record<string, { total: number; calibrated: number; withLatLng: number }> = {};
    
    clubs.forEach(club => {
      const country = club.country || "Unknown";
      if (!stats[country]) {
        stats[country] = { total: 0, calibrated: 0, withLatLng: 0 };
      }
      stats[country].total++;
      if (club.is_calibration_point && club.x_position && club.y_position) {
        stats[country].calibrated++;
      }
      if (club.latitude && club.longitude) {
        stats[country].withLatLng++;
      }
    });
    
    return stats;
  }, [clubs]);

  // Get clubs for selected country
  const countryClubs = useMemo(() => {
    if (selectedCountry === "all") return clubs;
    return clubs.filter(c => c.country === selectedCountry);
  }, [clubs, selectedCountry]);

  // All calibration points across the entire map
  const allCalibrationPoints = useMemo(() => {
    return clubs.filter(c => 
      c.is_calibration_point && 
      c.x_position !== null && 
      c.y_position !== null &&
      c.latitude !== null &&
      c.longitude !== null
    );
  }, [clubs]);

  const calibrationPoints = useMemo(() => {
    return countryClubs.filter(c => 
      c.is_calibration_point && 
      c.x_position !== null && 
      c.y_position !== null &&
      c.latitude !== null &&
      c.longitude !== null
    );
  }, [countryClubs]);

  const uncalibratedClubs = useMemo(() => {
    return countryClubs.filter(c => 
      !c.is_calibration_point &&
      c.latitude !== null &&
      c.longitude !== null
    );
  }, [countryClubs]);

  // Populate lat/lng coordinates for clubs that don't have them
  const handlePopulateCoordinates = async () => {
    setPopulatingCoords(true);
    try {
      const clubsToUpdate = clubs.filter(c => !c.latitude || !c.longitude);
      let updated = 0;
      
      for (const club of clubsToUpdate) {
        const coords = getClubCoordinates(club.club_name, club.country || "");
        if (coords) {
          const { error } = await supabase
            .from("club_map_positions")
            .update({ latitude: coords.lat, longitude: coords.lng })
            .eq("id", club.id);
          
          if (!error) updated++;
        }
      }
      
      toast.success(`Updated coordinates for ${updated} clubs`);
      onRefresh();
    } catch (error) {
      console.error("Error populating coordinates:", error);
      toast.error("Failed to populate coordinates");
    } finally {
      setPopulatingCoords(false);
    }
  };

  // Mark a manually-positioned club as a calibration point
  const handleMarkAsCalibrationPoint = async (clubId: string) => {
    try {
      const club = clubs.find(c => c.id === clubId);
      if (!club) return;

      // Get lat/lng if not already set
      let lat = club.latitude;
      let lng = club.longitude;
      
      if (!lat || !lng) {
        const coords = getClubCoordinates(club.club_name, club.country || "");
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        } else {
          toast.error("Cannot find geographic coordinates for this club");
          return;
        }
      }

      const { error } = await supabase
        .from("club_map_positions")
        .update({ 
          is_calibration_point: true,
          latitude: lat,
          longitude: lng
        })
        .eq("id", clubId);
      
      if (error) throw error;
      toast.success(`${club.club_name} marked as calibration point`);
      onRefresh();
    } catch (error) {
      console.error("Error marking calibration point:", error);
      toast.error("Failed to mark calibration point");
    }
  };

  // Calculate affine transformation using least squares
  // Solves: x = a*lng + b*lat + e, y = c*lng + d*lat + f
  const calculateTransformation = (points: CalibrationPoint[]) => {
    if (points.length < 3) return null;

    const n = points.length;
    
    // Build matrices for least squares: A * params = B
    // For X: [lng, lat, 1] * [a, b, e]^T = x
    // For Y: [lng, lat, 1] * [c, d, f]^T = y
    
    // Calculate sums for normal equations
    let sumLng = 0, sumLat = 0;
    let sumLng2 = 0, sumLat2 = 0, sumLngLat = 0;
    let sumXLng = 0, sumXLat = 0, sumX = 0;
    let sumYLng = 0, sumYLat = 0, sumY = 0;
    
    for (const p of points) {
      sumLng += p.lng;
      sumLat += p.lat;
      sumLng2 += p.lng * p.lng;
      sumLat2 += p.lat * p.lat;
      sumLngLat += p.lng * p.lat;
      sumXLng += p.x * p.lng;
      sumXLat += p.x * p.lat;
      sumX += p.x;
      sumYLng += p.y * p.lng;
      sumYLat += p.y * p.lat;
      sumY += p.y;
    }
    
    // Solve 3x3 system using Cramer's rule
    // | sumLng2   sumLngLat  sumLng  | | a |   | sumXLng |
    // | sumLngLat sumLat2    sumLat  | | b | = | sumXLat |
    // | sumLng    sumLat     n       | | e |   | sumX    |
    
    const det = sumLng2 * (sumLat2 * n - sumLat * sumLat)
              - sumLngLat * (sumLngLat * n - sumLat * sumLng)
              + sumLng * (sumLngLat * sumLat - sumLat2 * sumLng);
    
    if (Math.abs(det) < 0.0001) {
      console.error("Matrix is singular, calibration failed");
      return null;
    }
    
    // Solve for X transformation coefficients (a, b, e)
    const detA = sumXLng * (sumLat2 * n - sumLat * sumLat)
               - sumLngLat * (sumXLat * n - sumLat * sumX)
               + sumLng * (sumXLat * sumLat - sumLat2 * sumX);
    
    const detB = sumLng2 * (sumXLat * n - sumLat * sumX)
               - sumXLng * (sumLngLat * n - sumLat * sumLng)
               + sumLng * (sumLngLat * sumX - sumXLat * sumLng);
    
    const detE = sumLng2 * (sumLat2 * sumX - sumLat * sumXLat)
               - sumLngLat * (sumLngLat * sumX - sumLat * sumXLng)
               + sumXLng * (sumLngLat * sumLat - sumLat2 * sumLng);
    
    const a = detA / det;
    const b = detB / det;
    const e = detE / det;
    
    // Solve for Y transformation coefficients (c, d, f)
    const detC = sumYLng * (sumLat2 * n - sumLat * sumLat)
               - sumLngLat * (sumYLat * n - sumLat * sumY)
               + sumLng * (sumYLat * sumLat - sumLat2 * sumY);
    
    const detD = sumLng2 * (sumYLat * n - sumLat * sumY)
               - sumYLng * (sumLngLat * n - sumLat * sumLng)
               + sumLng * (sumLngLat * sumY - sumYLat * sumLng);
    
    const detF = sumLng2 * (sumLat2 * sumY - sumLat * sumYLat)
               - sumLngLat * (sumLngLat * sumY - sumLat * sumYLng)
               + sumYLng * (sumLngLat * sumLat - sumLat2 * sumLng);
    
    const c = detC / det;
    const d = detD / det;
    const f = detF / det;
    
    console.log("Affine transformation coefficients:", { a, b, c, d, e, f });
    
    return {
      transform: (lat: number, lng: number) => {
        const x = a * lng + b * lat + e;
        const y = c * lng + d * lat + f;
        return { x, y };
      }
    };
  };

  // Apply calibration to a specific country
  const calibrateCountry = async (countryName: string, countryClubsList: MapClub[]) => {
    const countryCalibrationPoints = countryClubsList.filter(c => 
      c.is_calibration_point && 
      c.x_position !== null && 
      c.y_position !== null &&
      c.latitude !== null &&
      c.longitude !== null
    );

    if (countryCalibrationPoints.length < 3) {
      return { updated: 0, skipped: true };
    }

    const points: CalibrationPoint[] = countryCalibrationPoints.map(c => ({
      lat: c.latitude!,
      lng: c.longitude!,
      x: c.x_position!,
      y: c.y_position!
    }));

    const transformation = calculateTransformation(points);
    if (!transformation) {
      return { updated: 0, skipped: true };
    }

    const countryUncalibratedClubs = countryClubsList.filter(c => 
      !c.is_calibration_point &&
      c.latitude !== null &&
      c.longitude !== null
    );

    let updated = 0;
    for (const club of countryUncalibratedClubs) {
      if (club.latitude && club.longitude) {
        const { x, y } = transformation.transform(club.latitude, club.longitude);
        
        const randomX = (Math.random() - 0.5) * 8;
        const randomY = (Math.random() - 0.5) * 8;
        
        const { error } = await supabase
          .from("club_map_positions")
          .update({
            x_position: Math.round((x + randomX) * 10) / 10,
            y_position: Math.round((y + randomY) * 10) / 10
          })
          .eq("id", club.id);
        
        if (!error) updated++;
      }
    }

    return { updated, skipped: false };
  };

  // Apply calibration using ALL calibration points to ALL uncalibrated clubs
  const handleApplyGlobalCalibration = async () => {
    if (allCalibrationPoints.length < 3) {
      toast.error("Need at least 3 calibration points on the map.");
      return;
    }

    setCalibrating(true);
    try {
      const points: CalibrationPoint[] = allCalibrationPoints.map(c => ({
        lat: c.latitude!,
        lng: c.longitude!,
        x: c.x_position!,
        y: c.y_position!
      }));

      const transformation = calculateTransformation(points);
      if (!transformation) {
        toast.error("Failed to calculate transformation");
        return;
      }

      // Get all clubs that aren't calibration points and have lat/lng
      const uncalibrated = clubs.filter(c => 
        !c.is_calibration_point &&
        c.latitude !== null &&
        c.longitude !== null
      );

      let updated = 0;
      for (const club of uncalibrated) {
        if (club.latitude && club.longitude) {
          const { x, y } = transformation.transform(club.latitude, club.longitude);
          
          const randomX = (Math.random() - 0.5) * 8;
          const randomY = (Math.random() - 0.5) * 8;
          
          const { error } = await supabase
            .from("club_map_positions")
            .update({
              x_position: Math.round((x + randomX) * 10) / 10,
              y_position: Math.round((y + randomY) * 10) / 10
            })
            .eq("id", club.id);
          
          if (!error) updated++;
        }
      }

      toast.success(`Calibrated ${updated} clubs using ${allCalibrationPoints.length} reference points`);
      onRefresh();
    } catch (error) {
      console.error("Error applying calibration:", error);
      toast.error("Failed to apply calibration");
    } finally {
      setCalibrating(false);
    }
  };

  // Apply calibration to uncalibrated clubs in selected country
  const handleApplyCalibration = async () => {
    if (calibrationPoints.length < 3) {
      toast.error("Need at least 3 calibration points. Position and mark more clubs as calibration points.");
      return;
    }

    setCalibrating(true);
    try {
      const result = await calibrateCountry(selectedCountry, countryClubs);
      if (result.skipped) {
        toast.error("Failed to calculate transformation");
      } else {
        toast.success(`Calibrated ${result.updated} clubs in ${selectedCountry}`);
      }
      onRefresh();
    } catch (error) {
      console.error("Error applying calibration:", error);
      toast.error("Failed to apply calibration");
    } finally {
      setCalibrating(false);
    }
  };

  const currentStats = selectedCountry === "all" 
    ? Object.values(calibrationStats).reduce(
        (acc, s) => ({ total: acc.total + s.total, calibrated: acc.calibrated + s.calibrated, withLatLng: acc.withLatLng + s.withLatLng }),
        { total: 0, calibrated: 0, withLatLng: 0 }
      )
    : calibrationStats[selectedCountry] || { total: 0, calibrated: 0, withLatLng: 0 };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          Geo-Calibration Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            <MapPin className="h-3 w-3" />
            {currentStats.total} clubs
          </Badge>
          <Badge variant={currentStats.calibrated >= 3 ? "default" : "secondary"} className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {currentStats.calibrated} calibration points
          </Badge>
          <Badge variant={currentStats.withLatLng > 0 ? "outline" : "destructive"} className="gap-1">
            {currentStats.withLatLng} with coordinates
          </Badge>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>How to calibrate:</strong></p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Click "Populate Coordinates" to add lat/lng to clubs</li>
            <li>Drag 3-4 clubs per country to their correct positions on the map</li>
            <li>Mark those clubs as calibration points</li>
            <li>Click "Apply Calibration" to position remaining clubs</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handlePopulateCoordinates}
            disabled={populatingCoords}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${populatingCoords ? 'animate-spin' : ''}`} />
            Populate Coordinates
          </Button>
          
          <Button 
            size="sm"
            onClick={handleApplyGlobalCalibration}
            disabled={calibrating || allCalibrationPoints.length < 3}
          >
            <Wand2 className={`h-3 w-3 mr-1 ${calibrating ? 'animate-spin' : ''}`} />
            Apply Calibration
          </Button>
        </div>

        {/* Calibration points list */}
        {allCalibrationPoints.length > 0 && (
          <div className="text-xs">
            <p className="font-medium mb-1">Calibration points ({allCalibrationPoints.length}):</p>
            <div className="flex flex-wrap gap-1">
              {allCalibrationPoints.map(c => (
                <Badge key={c.id} variant="secondary" className="text-xs">
                  {c.club_name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Warning if not enough calibration points */}
        {allCalibrationPoints.length < 3 && (
          <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              Need at least 3 calibration points. 
              Position clubs on the map, save, then mark them as calibration points.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
