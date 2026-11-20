package com.medibridge.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "insurers")
@Getter
@Setter
@NoArgsConstructor
public class Insurer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String code;
    /** Percentage of claims settled, e.g. 98.2 */
    private double claimSettlementRatio;
    private double rating;
    private String phone;
    private String email;
}
