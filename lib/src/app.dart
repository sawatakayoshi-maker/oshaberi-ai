import 'package:flutter/material.dart';

import 'features/home/home_screen.dart';

class OshaberiScannerApp extends StatelessWidget {
  const OshaberiScannerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '書類スキャン',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFFC9683D),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}
