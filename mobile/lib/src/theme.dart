import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AurelleColors {
  static const ink = Color(0xFF171717);
  static const ivory = Color(0xFFF5F3EF);
  static const gold = Color(0xFFB89B72);
  static const goldDeep = Color(0xFF8C7044);
  static const line = Color(0xFFE6E1D8);
  static const paper = Color(0xFFFFFFFF);
}

ThemeData aurelleTheme() {
  final text = GoogleFonts.interTextTheme().apply(
    bodyColor: AurelleColors.ink,
    displayColor: AurelleColors.ink,
  );
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: AurelleColors.ivory,
    colorScheme: const ColorScheme.light(
      primary: AurelleColors.ink,
      onPrimary: AurelleColors.ivory,
      secondary: AurelleColors.gold,
      surface: AurelleColors.paper,
    ),
    textTheme: text,
    appBarTheme: AppBarTheme(
      backgroundColor: AurelleColors.ivory,
      foregroundColor: AurelleColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: GoogleFonts.playfairDisplay(
        color: AurelleColors.ink,
        fontSize: 22,
        letterSpacing: 3,
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AurelleColors.ivory,
      indicatorColor: AurelleColors.gold.withValues(alpha: 0.35),
      labelTextStyle: WidgetStatePropertyAll(
        GoogleFonts.inter(fontSize: 11, letterSpacing: 0.4),
      ),
    ),
    inputDecorationTheme: const InputDecorationTheme(
      filled: true,
      fillColor: AurelleColors.paper,
      border: OutlineInputBorder(
        borderSide: BorderSide(color: AurelleColors.line),
      ),
    ),
  );
}

TextStyle display([double size = 36]) {
  return GoogleFonts.playfairDisplay(
    fontSize: size,
    fontWeight: FontWeight.w500,
    height: 1.05,
    color: AurelleColors.ink,
  );
}

TextStyle eyebrow() {
  return GoogleFonts.inter(
    fontSize: 11,
    letterSpacing: 2.2,
    color: AurelleColors.goldDeep,
    fontWeight: FontWeight.w500,
  );
}
